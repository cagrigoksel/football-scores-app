const API_KEY = '3f118a0b93754bcd84e7c3537200e252';
const API_URL = 'https://api.football-data.org/v4/matches';
const CORS_PROXY = 'https://cors-anywhere.herokuapp.com/';

const leagueOrder = [
    'FIFA World Cup',
    'European Championship',
    'UEFA Champions League',
    'Premier League',
    'Bundesliga',
    'La Liga',  // Changed from 'Primera Division'
    'Serie A',
    'Ligue 1',
    'Copa Libertadores',
    'Eredivisie',
    'Championship',
    'Primeira Liga',
];

const leagueColors = {
    'FIFA World Cup': '#4A7B9D',
    'European Championship': '#0A4E8F',
    'UEFA Champions League': '#0E1E5B',
    'Premier League': '#3D195B',
    'Bundesliga': '#D20515',
    'La Liga': '#EE8707',  // Changed from 'Primera Division'
    'Serie A': '#008fd7',
    'Ligue 1': '#091c3e',
    'Copa Libertadores': '#007749',
    'Eredivisie': '#FF4000',
    'Championship': '#FF8C00',
    'Primeira Liga': '#006600',
};

function getLeagueColor(leagueName) {
    return leagueColors[leagueName] || '#333'; // Default color if not found
}

const RATE_LIMIT_DELAY = 60000; // 60 seconds
let lastRequestTime = 0;

async function fetchMatches(date) {
    try {
        // Ensure the date is in the correct format (YYYY-MM-DD)
        const formattedDate = new Date(date).toISOString().split('T')[0];
        const url = `${CORS_PROXY}${API_URL}?date=${formattedDate}`;
        console.log('Fetching matches from URL:', url);
        const response = await fetch(url, {
            headers: {
                'X-Auth-Token': API_KEY,
                'Origin': 'http://localhost' // Replace with your actual origin
            }
        });
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Error response body:', errorBody);
            throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
        }
        const data = await response.json();
        console.log('API Response:', data);
        return data.matches || [];
    } catch (error) {
        console.error('Error fetching matches:', error);
        throw error;
    }
}

function createMatchElement(match) {
    const matchDiv = document.createElement('div');
    matchDiv.className = 'match';
    
    let timeDisplay;
    if (match.status === 'IN_PLAY' || match.status === 'PAUSED') {
        const minute = match.minute || 'N/A';
        timeDisplay = `<span class="live">LIVE</span>${minute}'`;
    } else if (match.status === 'FINISHED') {
        timeDisplay = 'FT';
    } else {
        timeDisplay = formatMatchTime(match.utcDate);
    }

    matchDiv.innerHTML = `
        <p class="match-time">${timeDisplay}</p>
        <div class="match-info">
            <div class="team home-team">
                <div class="team-name" title="${match.homeTeam.name}">${match.homeTeam.name}</div>
                <img src="${match.homeTeam.crest}" alt="${match.homeTeam.name}" onerror="this.src='placeholder.png';">
            </div>
            <p class="score">${match.score.fullTime.home ?? 0} - ${match.score.fullTime.away ?? 0}</p>
            <div class="team away-team">
                <img src="${match.awayTeam.crest}" alt="${match.awayTeam.name}" onerror="this.src='placeholder.png';">
                <div class="team-name" title="${match.awayTeam.name}">${match.awayTeam.name}</div>
            </div>
        </div>
    `;
    return matchDiv;
}

function formatMatchTime(utcDateString) {
    const date = new Date(utcDateString);
    return date.toLocaleString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
    });
}

function showLoading() {
    const container = document.getElementById('matches-container');
    container.innerHTML = '<p>Loading matches...</p>';
}

function showError() {
    const container = document.getElementById('matches-container');
    container.innerHTML = '<p>Unable to load matches. Please try again later.</p>';
}

function groupAndSortMatchesByLeague(matches) {
    const groupedMatches = {};
    matches.forEach(match => {
        let leagueName = match.competition.name;
        // Rename "Primera Division" to "La Liga"
        if (leagueName === "Primera Division") {
            leagueName = "La Liga";
        }
        if (!groupedMatches[leagueName]) {
            groupedMatches[leagueName] = [];
        }
        groupedMatches[leagueName].push(match);
    });

    // Sort leagues based on the predefined order
    const sortedLeagues = Object.keys(groupedMatches).sort((a, b) => {
        const indexA = leagueOrder.indexOf(a);
        const indexB = leagueOrder.indexOf(b);
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });

    const sortedGroupedMatches = {};
    sortedLeagues.forEach(league => {
        sortedGroupedMatches[league] = groupedMatches[league];
    });

    return sortedGroupedMatches;
}

function getCachedMatches(date) {
    const cached = localStorage.getItem(`matches_${date}`);
    return cached ? JSON.parse(cached) : null;
}

function cacheMatches(date, matches) {
    localStorage.setItem(`matches_${date}`, JSON.stringify(matches));
}

async function updateMatches(date) {
    showLoading();
    try {
        console.log('Updating matches for date:', date);
        const matches = await fetchMatches(date);
        console.log('Fetched matches:', matches);
        const container = document.getElementById('matches-container');
        container.innerHTML = '';
        
        if (matches.length === 0) {
            console.log('No matches found for date:', date);
            container.innerHTML = '<p>No matches available for the selected date.</p>';
        } else {
            const groupedMatches = groupAndSortMatchesByLeague(matches);
            
            for (const [leagueName, leagueMatches] of Object.entries(groupedMatches)) {
                container.appendChild(createLeagueElement(leagueName, leagueMatches));
            }
        }
    } catch (error) {
        console.error('Error in updateMatches:', error);
        const container = document.getElementById('matches-container');
        container.innerHTML = `<p>Error loading matches: ${error.message}. Please try again later.</p>`;
    }
}

function initDatePicker() {
    const dateInput = document.getElementById('selected-date');
    const fetchButton = document.getElementById('fetch-matches');

    // Set default date to today
    const today = new Date();
    dateInput.valueAsDate = today;

    fetchButton.addEventListener('click', () => {
        const selectedDate = dateInput.value;
        updateMatches(selectedDate);
    });
}

// Initialize date picker and fetch initial matches
document.addEventListener('DOMContentLoaded', () => {
    initDatePicker();
    const selectedDate = document.getElementById('selected-date').value;
    updateMatches(selectedDate);
    startLiveUpdates();
});

function createLeagueElement(leagueName, leagueMatches) {
    const leagueDiv = document.createElement('div');
    leagueDiv.className = 'league';
    const leagueColor = getLeagueColor(leagueName);
    leagueDiv.style.borderColor = leagueColor;
    
    const leagueHeader = document.createElement('div');
    leagueHeader.className = 'league-header';
    leagueHeader.style.borderBottomColor = leagueColor;
    leagueHeader.style.color = leagueColor;
    leagueHeader.style.cursor = 'pointer';
    
    leagueHeader.innerHTML = `
        <img src="${leagueMatches[0].competition.emblem}" alt="${leagueName}" class="league-logo" onerror="this.style.display='none';">
        <h2>${leagueName}</h2>
    `;
    
    leagueHeader.addEventListener('click', () => showLeagueStandings(leagueMatches[0].competition.id, leagueName));
    
    leagueDiv.appendChild(leagueHeader);
    
    leagueMatches.forEach(match => {
        leagueDiv.appendChild(createMatchElement(match));
    });
    
    return leagueDiv;
}

async function showLeagueStandings(competitionId, leagueName) {
    try {
        showLoading();
        const url = `${CORS_PROXY}https://api.football-data.org/v4/competitions/${competitionId}/standings`;
        const response = await fetch(url, {
            headers: {
                'X-Auth-Token': API_KEY
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        displayStandings(data.standings[0].table, leagueName);
    } catch (error) {
        console.error('Error fetching standings:', error);
        showError('Failed to load standings. Please try again later.');
    }
}

function displayStandings(standings, leagueName) {
    const container = document.getElementById('matches-container');
    container.innerHTML = '';
    
    const backButton = document.createElement('button');
    backButton.textContent = 'Back to Matches';
    backButton.className = 'back-button';
    backButton.addEventListener('click', () => {
        const selectedDate = document.getElementById('selected-date').value;
        updateMatches(selectedDate);
    });
    container.appendChild(backButton);
    
    const header = document.createElement('h2');
    header.textContent = `${leagueName} Standings`;
    container.appendChild(header);
    
    const table = document.createElement('table');
    table.className = 'standings-table';
    
    const headerRow = table.insertRow();
    ['Position', 'Team', 'Played', 'Won', 'Drawn', 'Lost', 'GF', 'GA', 'GD', 'Points'].forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        headerRow.appendChild(th);
    });
    
    standings.forEach(team => {
        const row = table.insertRow();
        [
            team.position,
            team.team.name,
            team.playedGames,
            team.won,
            team.draw,
            team.lost,
            team.goalsFor,
            team.goalsAgainst,
            team.goalDifference,
            team.points
        ].forEach(text => {
            const cell = row.insertCell();
            cell.textContent = text;
        });
    });
    
    container.appendChild(table);
}

function startLiveUpdates() {
    setInterval(() => {
        const selectedDate = document.getElementById('selected-date').value;
        updateMatches(selectedDate);
    }, 60000); // Update every 60 seconds
}

// Add this to your initialization code
document.addEventListener('DOMContentLoaded', () => {
    initDatePicker();
    const selectedDate = document.getElementById('selected-date').value;
    updateMatches(selectedDate);
    startLiveUpdates();
});

