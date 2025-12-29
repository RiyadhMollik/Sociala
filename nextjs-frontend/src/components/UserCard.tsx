import { OnlineUser } from '@/hooks/usePresence';

interface UserCardProps {
  user: OnlineUser;
  onVideoCall: (username: string) => void;
  onAudioCall: (username: string) => void;
}

export default function UserCard({ user, onVideoCall, onAudioCall }: UserCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-14 h-14 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white text-xl font-bold">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
          <div>
            <div className="font-semibold text-gray-800">{user.username}</div>
            <div className="text-sm text-green-600 flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              Online
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex space-x-2">
        <button
          onClick={() => onVideoCall(user.username)}
          className="flex-1 bg-primary hover:bg-primary/90 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
        >
          <span>📹</span>
          <span>Video</span>
        </button>
        <button
          onClick={() => onAudioCall(user.username)}
          className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
        >
          <span>🎤</span>
          <span>Audio</span>
        </button>
      </div>
    </div>
  );
}
