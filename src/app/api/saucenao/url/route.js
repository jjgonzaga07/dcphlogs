import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { imageUrl } = await request.json();
    
    if (!imageUrl) {
      return NextResponse.json({ error: 'No image URL provided' }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_SAUCENAO_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'SauceNAO API key not set in environment variables.' }, { status: 500 });
    }

    console.log('Searching for image URL:', imageUrl);

    // Create URL parameters for SauceNAO API
    const params = new URLSearchParams({
      api_key: apiKey,
      output_type: '2', // JSON output
      testmode: '1', // Test mode for development
      db: '999', // Search all databases
      numres: '16', // Number of results
      dedupe: '2', // All dedupe methods
      hide: '0', // Show all results
      url: imageUrl
    });

    // Make request to SauceNAO API
    const response = await fetch(`https://saucenao.com/search.php?${params.toString()}`);

    console.log('SauceNAO response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SauceNAO API error response:', errorText);
      throw new Error(`SauceNAO API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('SauceNAO API success response:', data);
    
    // Check for API errors
    if (data.status && data.status > 0) {
      console.error('SauceNAO API returned error status:', data.status);
      return NextResponse.json({ 
        error: `SauceNAO API error: Status ${data.status}`,
        details: data
      }, { status: 400 });
    }
    
    return NextResponse.json(data);

  } catch (error) {
    console.error('SauceNAO API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to search SauceNAO' },
      { status: 500 }
    );
  }
} 