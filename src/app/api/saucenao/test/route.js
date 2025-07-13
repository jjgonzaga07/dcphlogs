import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Test the API key with a simple search
    const response = await fetch('https://saucenao.com/search.php?api_key=cce55ceccfc7002721424d755304ce278f5bbdf4&output_type=2&testmode=1&url=https://saucenao.com/img/logo.png');
    
    console.log('Test API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Test API error:', errorText);
      return NextResponse.json({ error: `API test failed: ${response.status} - ${errorText}` }, { status: 500 });
    }

    const data = await response.json();
    console.log('Test API success:', data);
    return NextResponse.json({ 
      success: true, 
      message: 'API key is working',
      data: data 
    });

  } catch (error) {
    console.error('Test API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 