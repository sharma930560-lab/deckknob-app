import CreatorWorkspace from '@/features/social/components/CreatorWorkspace';

export const metadata = {
  title: 'Create | DECKKNOB',
  description: 'Create a new Post, Story, Reel, or Event',
};

export default function CreatePage() {
  return (
    <div className="min-h-screen bg-black">
      <CreatorWorkspace />
    </div>
  );
}
