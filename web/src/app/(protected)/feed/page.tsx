import Feed from '@/features/social/components/Feed';

export const metadata = {
  title: 'Feed | DECKKNOB',
  description: 'Your DECKKNOB Feed',
};

export default function FeedPage() {
  return (
    <div className="min-h-screen bg-black">
      <Feed />
    </div>
  );
}
