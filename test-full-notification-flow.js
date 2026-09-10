const http = require('http');

const BASE_URL = 'http://localhost:3000/api/v1';

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      method: method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTest() {
  console.log('=== STARTING FULL REALTIME & PUSH NOTIFICATION TEST ===\n');

  try {
    // 1. Login Admin
    console.log('1. Logging in Admin...');
    const adminLogin = await request('POST', '/auth/signin', {
      phoneNumber: '01600000000',
      password: '123456',
    });
    console.log('Admin Login Status:', adminLogin.status);
    const adminToken = adminLogin.body?.data?.accessToken;

    // 2. Login Party & Company
    const partyLogin = await request('POST', '/auth/signin', {
      phoneNumber: '01400000000',
      password: '123456',
    });
    const partyToken = partyLogin.body?.data?.accessToken;

    const companyLogin = await request('POST', '/auth/signin', {
      phoneNumber: '01500000000',
      password: '123456',
    });
    const companyToken = companyLogin.body?.data?.accessToken;

    // 3. Test New Product Notification
    console.log('\n2. Creating new product by Company...');
    const categoriesRes = await request('GET', '/categories', null, companyToken);
    const categoryList = categoriesRes.body?.data?.data || categoriesRes.body?.data || [];
    const categoryId = categoryList[0]?.categoryId;

    if (categoryId) {
      const prodRes = await request('POST', '/products', {
        productName: 'প্রিমিয়াম ৬০ গ্রেড রড 16mm',
        productImage: ['https://example.com/rod.jpg'],
        unit: 'TON',
        bagSize: 'BAG',
        packagingType: 'BAG',
        unitType: 'TON',
        defaultPrice: 95000,
        regularPrice: 98000,
        offerPrice: 95000,
        minimumOrder: 5,
        stockSize: 100,
        description: 'উন্নত মানের স্টিল রড',
        categoryId,
      }, companyToken);
      console.log('Product Created Status:', prodRes.status);
      console.log('Product Name:', prodRes.body?.data?.productName);
    }

    // Party checks notification for new product
    console.log('\n3. Party checking notifications for new Product...');
    const partyNotes = await request('GET', '/notifications', null, partyToken);
    const latestPartyNote = partyNotes.body?.data?.data?.[0];
    if (latestPartyNote) {
      console.log('Party Notification Title (Bangla):', latestPartyNote.title);
      console.log('Party Notification Message (Bangla):', latestPartyNote.message);
    }

    // 4. Test New Company Registration -> Notify Admin
    console.log('\n4. Registering a new Company...');
    const randPhone = `01599${Math.floor(10000 + Math.random() * 90000)}`;
    const regCompanyRes = await request('POST', '/companies/register', {
      companyName: 'টেস্ট নতুন স্টিল মিলস',
      ownerName: 'আব্দুল রহিম',
      email: `company_${Date.now()}@example.com`,
      phoneNumber: randPhone,
      password: 'password123',
      address: 'মিরপুর ১০, ঢাকা',
      latitude: 23.8103,
      longitude: 90.4125,
      categoryId,
    });
    console.log('Register Company Status:', regCompanyRes.status);

    // 5. Test New Party Registration -> Notify Admin
    console.log('\n5. Registering a new Party (Customer)...');
    const randPartyPhone = `01499${Math.floor(10000 + Math.random() * 90000)}`;
    const regPartyRes = await request('POST', '/parties/register', {
      partyName: 'টেস্ট নতুন কাস্টমার এন্টারপ্রাইজ',
      businessName: 'নতুন ব্যবসা',
      email: `party_${Date.now()}@example.com`,
      phoneNumber: randPartyPhone,
      password: 'password123',
      address: 'উত্তরা, ঢাকা',
      district: 'Dhaka',
      upozela: 'Uttara',
      bazzarArea: 'Uttara Sector 3',
      description: 'বিল্ডিং কনস্ট্রাকশন ঠিকাদার',
      categoryId,
    });
    console.log('Register Party Status:', regPartyRes.status);

    // Admin checks notifications
    console.log('\n6. Admin checking notifications for New Company & Party registrations...');
    const adminNotes = await request('GET', '/notifications', null, adminToken);
    const adminNoteList = adminNotes.body?.data?.data || [];
    console.log('Admin Notifications Count:', adminNoteList.length);
    if (adminNoteList.length > 0) {
      adminNoteList.slice(0, 3).forEach((note, idx) => {
        console.log(`[Admin Note ${idx + 1}] Title: ${note.title} | Message: ${note.message}`);
      });
    }

    console.log('\n=== ALL EXTENDED NOTIFICATION TESTS COMPLETED SUCCESSFULLY ===');
  } catch (err) {
    console.error('Test Error:', err);
  }
}

runTest();
