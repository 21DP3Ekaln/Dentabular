import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getFavorites } from '@/app/actions/favoriteActions';

export async function GET() {
  try {
    // Ensure user is authenticated
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get user favorites
    const { favorites } = await getFavorites();
    
    if (favorites.length === 0) {
      return NextResponse.json({ error: 'No favorites to export' }, { status: 404 });
    }

    // Return the favorites data for client-side PDF generation
    return NextResponse.json({ favorites });
  } catch (error) {
    console.error('Error exporting favorites:', error);
    return NextResponse.json({ error: 'Failed to export favorites' }, { status: 500 });
  }
} 