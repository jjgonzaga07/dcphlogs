export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import FormData from 'form-data';
import fetch from 'node-fetch';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const image = formData.get('image');
    
    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_SAUCENAO_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'SauceNAO API key not set in environment variables.' }, { status: 500 });
    }

    console.log('Image received:', {
      name: image.name,
      type: image.type,
      size: image.size
    });

    // Convert the image to a Buffer
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);

    console.log('Buffer created, size:', buffer.length);

    // Create new FormData for SauceNAO API using form-data library
    const sauceNAOFormData = new FormData();
    sauceNAOFormData.append('image', buffer, {
      filename: image.name,
      contentType: image.type
    });
    sauceNAOFormData.append('api_key', apiKey);
    sauceNAOFormData.append('output_type', '2'); // JSON output
    sauceNAOFormData.append('testmode', '1'); // Test mode for development
    sauceNAOFormData.append('db', '999'); // Search all databases
    sauceNAOFormData.append('numres', '16'); // Number of results
    sauceNAOFormData.append('dedupe', '2'); // All dedupe methods
    sauceNAOFormData.append('hide', '0'); // Show all results

    console.log('FormData created, sending to SauceNAO...');

    // Use node-fetch for the request
    const response = await fetch('https://saucenao.com/search.php', {
      method: 'POST',
      body: sauceNAOFormData,
      headers: sauceNAOFormData.getHeaders()
    });

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
    console.error('SauceNAO API error:', error, error.stack);
    return NextResponse.json(
      { error: error.message || 'Failed to search SauceNAO', stack: error.stack },
      { status: 500 }
    );
  }
} 