const fetch = require('node-fetch');

async function testAPI() {
  try {
    // First login to get session
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'ross@aloa.agency',
        password: '1Cactus22!!'
      })
    });

    const loginData = await loginResponse.json();
    console.log('Login response:', loginData.success ? 'Success' : 'Failed');

    // Extract cookies from login response
    const cookies = loginResponse.headers.raw()['set-cookie'];
    const cookieString = cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '';

    // Now fetch users
    const usersResponse = await fetch('http://localhost:3000/api/auth/users', {
      headers: {
        'Cookie': cookieString
      }
    });

    const usersData = await usersResponse.json();
    
    // Find John G
    const johnG = usersData.users?.find(u => u.email === 'exabyte@me.com');
    
    console.log('\n=== John G from API ===');
    console.log(JSON.stringify(johnG, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

testAPI();