import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { apiClient } from '../utils/apiClient';

interface StoryGroup {
  authorId: string;
  hasUnseen: boolean;
  stories: { id: string }[];
}

export function StoriesBar() {
  const router = useRouter();
  const [groups, setGroups] = useState<StoryGroup[]>([]);

  useEffect(() => {
    apiClient.get<StoryGroup[]>('/stories/feed').then(setGroups).catch(() => setGroups([]));
  }, []);

  if (groups.length === 0) return null;

  return (
    <div style={{ display: 'flex', gap: 16, overflowX: 'auto', padding: '12px 0', marginBottom: 16 }}>
      {groups.map((group) => (
        <button
          key={group.authorId}
          onClick={() => router.push(`/stories/${group.stories[0].id}`)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              border: group.hasUnseen ? '3px solid #ff5a3c' : '3px solid #ddd',
            }}
          />
          <span style={{ fontSize: 12, color: '#333' }}>{group.authorId.slice(0, 6)}</span>
        </button>
      ))}
    </div>
  );
}
