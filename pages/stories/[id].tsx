import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { apiClient } from '../../utils/apiClient';

interface StoryData {
  id: string;
  mediaUrl: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'TEXT';
}

export default function StoryViewerPage() {
  const router = useRouter();
  const { id } = router.query;
  const [story, setStory] = useState<StoryData | null>(null);

  useEffect(() => {
    if (typeof id !== 'string') return;
    apiClient.get<StoryData>(`/stories/${id}`).then(setStory).catch(() => setStory(null));
    apiClient.post(`/stories/${id}/view`).catch(() => {});
  }, [id]);

  function close() {
    router.back();
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={close}
    >
      <div style={{ position: 'absolute', top: 12, left: 12, right: 12, height: 3, background: '#ffffff55', borderRadius: 2 }}>
        <div style={{ width: '40%', height: '100%', background: '#fff', borderRadius: 2 }} />
      </div>
      {story ? (
        story.mediaType === 'VIDEO' ? (
          <video src={story.mediaUrl} autoPlay style={{ maxHeight: '100%', maxWidth: '100%' }} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={story.mediaUrl} alt="story" style={{ maxHeight: '100%', maxWidth: '100%' }} />
        )
      ) : (
        <p style={{ color: '#fff' }}>A carregar...</p>
      )}
    </div>
  );
}
