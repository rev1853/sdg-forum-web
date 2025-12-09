import fs from 'fs';

const API_BASE_URL = 'https://sdg-forum-api.truesurvi4.xyz';
const SETUP_USER = {
    email: 'setup_v1@sdgforum.org',
    password: 'SetupPassword123!',
    identifier: 'setup_v1@sdgforum.org'
};

const CATEGORIES = [
    { id: 'cat_sdg01', name: 'No Poverty', sdg_number: 1 },
    { id: 'cat_sdg02', name: 'Zero Hunger', sdg_number: 2 },
    { id: 'cat_sdg03', name: 'Good Health and Well-Being', sdg_number: 3 },
    { id: 'cat_sdg04', name: 'Quality Education', sdg_number: 4 },
    { id: 'cat_sdg05', name: 'Gender Equality', sdg_number: 5 },
    { id: 'cat_sdg06', name: 'Clean Water and Sanitation', sdg_number: 6 },
    { id: 'cat_sdg07', name: 'Affordable and Clean Energy', sdg_number: 7 },
    { id: 'cat_sdg08', name: 'Decent Work and Economic Growth', sdg_number: 8 },
    { id: 'cat_sdg09', name: 'Industry, Innovation and Infrastructure', sdg_number: 9 },
    { id: 'cat_sdg10', name: 'Reduced Inequalities', sdg_number: 10 },
    { id: 'cat_sdg11', name: 'Sustainable Cities and Communities', sdg_number: 11 },
    { id: 'cat_sdg12', name: 'Responsible Consumption and Production', sdg_number: 12 },
    { id: 'cat_sdg13', name: 'Climate Action', sdg_number: 13 },
    { id: 'cat_sdg14', name: 'Life Below Water', sdg_number: 14 },
    { id: 'cat_sdg15', name: 'Life on Land', sdg_number: 15 },
    { id: 'cat_sdg16', name: 'Peace, Justice and Strong Institutions', sdg_number: 16 },
    { id: 'cat_sdg17', name: 'Partnerships for the Goals', sdg_number: 17 }
];

async function login() {
    console.log('Logging in...');
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            identifier: SETUP_USER.identifier,
            password: SETUP_USER.password
        })
    });

    if (!response.ok) {
        // Try registering if login fails
        console.log('Login failed, trying to register...');
        const regResponse = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: SETUP_USER.email,
                username: 'setup_v1',
                name: 'Setup Admin',
                password: SETUP_USER.password
            })
        });

        if (!regResponse.ok) {
            const text = await regResponse.text();
            throw new Error(`Failed to register: ${text}`);
        }

        // Login again
        const loginRetry = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                identifier: SETUP_USER.identifier,
                password: SETUP_USER.password
            })
        });

        if (!loginRetry.ok) throw new Error('Failed to login after registration');
        const data = await loginRetry.json();
        return data.token;
    }

    const data = await response.json();
    return data.token;
}

async function createGroup(token, name, description, categoryIds = [], type = 'PUBLIC') {
    console.log(`Creating group: ${name}`);
    const payload = { name, description, type };
    if (categoryIds.length > 0) {
        payload.categoryIds = categoryIds;
    }

    const response = await fetch(`${API_BASE_URL}/chat/groups`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const text = await response.text();
        console.error(`Failed to create group ${name}: ${text}`);
    } else {
        console.log(`Group ${name} created successfully.`);
    }
}

async function main() {
    try {
        const token = await login();
        console.log('Logged in successfully.');

        // Create Global Room
        // Global room might not need categories or uses a special one? Let's try without first or skip if it fails.
        // Actually, looking at the error "Select between 1 and 3 categories", it seems mandatory.
        // Let's assume Global uses all or none? The error implies mandatory.
        // Let's use a dummy category or the first one for Global if needed, or maybe it's specific to SDG rooms.
        // Wait, the previous error was for SDG rooms too.

        // Let's fetch categories first to get real IDs.
        const catResponse = await fetch(`${API_BASE_URL}/categories`);
        const catData = await catResponse.json();
        const categoriesMap = new Map((catData.categories || []).map(c => [c.sdg_number, c.id]));

        // Create Global Room (maybe attach to Goal 17 as partnership?)
        const globalCatId = categoriesMap.get(17);
        if (globalCatId) {
            await createGroup(token, 'Global announcements', 'Platform updates and community-wide news.', [globalCatId]);
        }

        // Create SDG Rooms
        for (const cat of CATEGORIES) {
            const realId = categoriesMap.get(cat.sdg_number);
            if (realId) {
                const name = `SDG ${cat.sdg_number} • ${cat.name}`;
                const description = `Discussion and collaboration for Goal ${cat.sdg_number}.`;
                await createGroup(token, name, description, [realId]);
            }
        }

        console.log('All groups processed.');
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
