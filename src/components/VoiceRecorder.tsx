'use client';

import { useState, useEffect } from 'react';
import { useDeepgram } from '../lib/contexts/DeepgramContext';
import { motion } from 'framer-motion';

export default function VoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const { deepgramApiKey } = useDeepgram();

  useEffect(() => {
    if (!deepgramApiKey) {
      console.error('Deepgram API key not found');
      return;
    }

    let mediaRecorder: MediaRecorder | null = null;
    let socket: WebSocket | null = null;

    const startRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        socket = new WebSocket('wss://api.deepgram.com/v1/listen', [
          'token',
          deepgramApiKey,
        ]);

        socket.onopen = () => {
          console.log('WebSocket connection established');
          mediaRecorder?.start(250);
        };

        socket.onmessage = (message) => {
          const received = JSON.parse(message.data);
          const transcript = received.channel.alternatives[0].transcript;
          if (transcript) {
            setTranscript((prev) => prev + ' ' + transcript);
          }
        };

        socket.onclose = () => {
          console.log('WebSocket connection closed');
        };

        socket.onerror = (error) => {
          console.error('WebSocket error:', error);
        };

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && socket?.readyState === WebSocket.OPEN) {
            socket.send(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          stream.getTracks().forEach((track) => track.stop());
          socket?.close();
        };

        setIsRecording(true);
      } catch (error) {
        console.error('Error starting recording:', error);
      }
    };

    const stopRecording = () => {
      mediaRecorder?.stop();
      setIsRecording(false);
    };

    if (isRecording) {
      startRecording();
    } else {
      stopRecording();
    }

    return () => {
      if (mediaRecorder?.state === 'recording') {
        stopRecording();
      }
    };
  }, [isRecording, deepgramApiKey]);

  const handleSave = async () => {
    if (!transcript.trim()) return;
    
    try {
      // TODO: Implement saving transcript
      console.log('Saving transcript:', transcript);
      setTranscript('');
    } catch (error) {
      console.error('Error saving transcript:', error);
    }
  };

  return (
    <div className="space-y-4">
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsRecording(!isRecording)}
        className={`w-16 h-16 rounded-full flex items-center justify-center ${
          isRecording ? 'bg-red-500' : 'bg-blue-500'
        } text-white focus:outline-none`}
      >
        <span className="sr-only">{isRecording ? 'Stop' : 'Start'} Recording</span>
        <motion.div
          animate={{ scale: isRecording ? [1, 1.2, 1] : 1 }}
          transition={{ repeat: isRecording ? Infinity : 0, duration: 1 }}
          className={`w-8 h-8 rounded-full ${
            isRecording ? 'bg-red-600' : 'bg-blue-600'
          }`}
        />
      </motion.button>

      {transcript && (
        <div className="space-y-2">
          <p className="text-gray-700">{transcript}</p>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            บันทึก
          </button>
        </div>
      )}
    </div>
  );
}