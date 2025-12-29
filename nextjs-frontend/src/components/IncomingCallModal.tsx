import { CallData } from '@/hooks/useWebRTC';

interface IncomingCallModalProps {
  isActive: boolean;
  callData: CallData | null;
  onAccept: () => void;
  onReject: () => void;
}

export default function IncomingCallModal({
  isActive,
  callData,
  onAccept,
  onReject,
}: IncomingCallModalProps) {
  if (!isActive || !callData) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center animate-bounce-slow">
        {/* Caller Avatar */}
        <div className="mb-6">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-lg">
            {callData.caller_username.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Call Info */}
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {callData.caller_username}
        </h2>
        <p className="text-lg text-gray-600 mb-8">
          {callData.call_type === 'video' ? '📹 Video Call' : '🎤 Audio Call'}
        </p>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            onClick={onAccept}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white py-4 px-6 rounded-2xl font-bold text-lg transition-all transform hover:scale-105 flex items-center justify-center space-x-2 shadow-lg"
          >
            <span className="text-2xl">✅</span>
            <span>Accept</span>
          </button>
          <button
            onClick={onReject}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white py-4 px-6 rounded-2xl font-bold text-lg transition-all transform hover:scale-105 flex items-center justify-center space-x-2 shadow-lg"
          >
            <span className="text-2xl">❌</span>
            <span>Reject</span>
          </button>
        </div>
      </div>
    </div>
  );
}
