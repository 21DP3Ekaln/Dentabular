import { redirect } from 'next/navigation';
import { getUserPreferredLanguage } from './actions/userActions';

export default async function Root() {
  // Get the user's preferred language
  const preferredLanguage = await getUserPreferredLanguage();
  
  // Redirect to the user's preferred locale
  redirect(`/${preferredLanguage}`);
}