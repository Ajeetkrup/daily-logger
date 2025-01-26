"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, Send, Edit, Trash2, Check, X } from "lucide-react";

export default function DailyLogPage() {
  const [inputText, setInputText] = useState("");
  const [inputDate, setInputDate] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [editingLog, setEditingLog] = useState<{
    id: string;
    content: string;
  } | null>(null);
  const recognition = useRef(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  useEffect(() => {
    if ("webkitSpeechRecognition" in window) {
      recognition.current = new (window as any).webkitSpeechRecognition();
      recognition.current.continuous = true;
      recognition.current.interimResults = true;
      recognition.current.lang = "en-US"; // Set the language to English (US)

      recognition.current.onresult = (event: any) => {
        let interimTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            setInputText((prev) => prev + transcript);
          } else {
            interimTranscript += transcript;
          }
        }
      };

      recognition.current.onstart = () => {
        setInputText("");
        setIsListening(true);
      };

      recognition.current.onerror = (event: any) => {
        console.error(event.error);
        setIsListening(false);
      };

      recognition.current.onend = () => {
        setIsListening(false);
      };
    } else {
      console.error(
        "webkitSpeechRecognition is not supported in this browser."
      );
    }

    fetchLogs();
  }, []);

  useEffect(() => {
    if (canvasRef.current) {
      startVisualizer();
    }

    if(!isListening) {
      stopVisualizer();
    }
  }, [isListening]);

  const fetchLogs = async () => {
    setErrorMessage("");
    try {
      const response = await fetch("/api/logs");
      const data = await response.json();
      setLogs(data);
    } catch (error) {
      console.error("Error fetching logs:", error);
      setErrorMessage("Error fetching logs");
    }
  };

  const submitLog = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    try {
      const response = await fetch("/api/logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: inputText, date: inputDate }),
      });
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.statusText}`);
      }
      await response.json();
      setInputText("");
      setInputDate("");
      fetchLogs(); // Refresh logs after adding
    } catch (error) {
      console.error("Error adding log:", error);
      setErrorMessage(error.message);
    }
  };

  const deleteLog = async (id: string) => {
    try {
      const response = await fetch("/api/logs", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.statusText}`);
      }
      await response.json();
      fetchLogs(); // Refresh logs after deletion
    } catch (error) {
      console.error("Error deleting log:", error);
      setErrorMessage(error.message);
    }
  };

  const startEditLog = (log: any) => {
    setErrorMessage("");
    const formattedDate = new Date(log.date).toISOString().split("T")[0];
    setEditingLog({ id: log._id, content: log.content, date: log.date });
    setInputText(log.content);
    setInputDate(formattedDate);
  };

  const updateLog = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    if (!editingLog) return;

    try {
      const response = await fetch("/api/logs", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingLog.id,
          content: inputText,
          date: inputDate,
        }),
      });
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.statusText}`);
      }
      await response.json();
      setEditingLog(null);
      setInputText("");
      setInputDate("");
      fetchLogs(); // Refresh logs after update
    } catch (error) {
      console.error("Error updating log:", error);
      setErrorMessage(error.message);
    }
  };

  const cancelEdit = () => {
    setErrorMessage("");
    setEditingLog(null);
    setInputText("");
    setInputDate("");
  };

  const startVisualizer = async () => {
    // console.log("Starting visualizer function");
    if (!canvasRef.current) return;
    // console.log("Starting visualizer");

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        window.webkitAudioContext)();
    }
    // console.log("Audio context created");

    if (!analyserRef.current) {
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
    }
    // console.log("Analyser created");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamSourceRef.current =
        audioContextRef.current.createMediaStreamSource(stream);
      mediaStreamSourceRef.current.connect(analyserRef.current);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      return;
    }
    // console.log("Media stream source connected");

    const canvas = canvasRef.current;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const canvasCtx = canvas.getContext("2d");
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    // console.log("Canvas and analyser setup");

    const draw = () => {
        requestAnimationFrame(draw);
  
        analyser.getByteFrequencyData(dataArray);
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
  
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const barWidth = canvas.width / bufferLength;
  
        for (let i = 0; i < bufferLength; i++) {
          const barHeight = dataArray[i] / 2;
  
          // Set the color to white
          canvasCtx.fillStyle = 'white';
  
          // Draw bars from the center outwards
          canvasCtx.fillRect(centerX + i * barWidth, centerY - barHeight / 2, barWidth - 1, barHeight);
          canvasCtx.fillRect(centerX - (i + 1) * barWidth, centerY - barHeight / 2, barWidth - 1, barHeight);
        }
      }

    draw();
  };

  const stopVisualizer = () => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
  };

  const startListening = () => {
    if (recognition) {
      setIsListening(true);
      recognition.current.start();
      //   startVisualizer();
    }
  };

  const stopListening = () => {
    if (recognition) {
      recognition.current.stop();
    }
  };

  return (
    <div id="webcrumbs">
      <div className="max-w-screen-md mx-auto mt-4 bg-gradient-to-br from-violet-500 to-purple-400 shadow-xl rounded-lg p-6 md:p-8 flex flex-col gap-6 md:gap-8 animate-fadeIn">
        {errorMessage && (
          <div className="bg-red-500 text-white p-3 rounded-lg mb-4">
            {errorMessage}
          </div>
        )}

        <h1 className="text-2xl md:text-4xl font-title text-neutral-50 font-bold text-center mb-4">
          Daily Log Tracker
        </h1>
        <form className="flex flex-col gap-4 md:gap-6">
          <label
            htmlFor="log-input"
            className="text-base md:text-lg text-neutral-50 font-medium text-center"
          >
            Enter your log (Text or Voice)
          </label>
          <div className="flex items-center gap-2 md:gap-3 border border-neutral-50 rounded-full px-3 md:px-4 py-2 bg-gradient-to-r from-white/30 to-white/10 backdrop-blur-lg shadow-sm">
            {isListening ? (
              <>
                <canvas
                  ref={canvasRef}
                  id="visualizer"
                  className="w-full h-[48px] bg-gradient-to-r rounded-full from-white/30 to-white/10 backdrop-blur-lg "
                ></canvas>{" "}
                <button
                  onClick={stopListening}
                  type="button"
                  className="w-[36px] h-[36px] md:w-[48px] md:h-[48px] bg-red-500 text-white rounded-full flex justify-center items-center shadow-md transform transition hover:scale-105"
                  aria-label="Stop Recording"
                >
                  <span className="material-symbols-outlined text-base md:text-xl">
                  <Mic size={24} />
                  </span>
                </button>
              </>
            ) : (
              <>
                <input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={isSending}
                  id="log-input"
                  type="text"
                  placeholder="Start typing or use voice..."
                  className="flex-1 text-neutral-950 text-sm md:text-lg outline-none bg-transparent placeholder:text-neutral-300"
                />
                {!editingLog && recognition.current && (
                  <button
                    onClick={startListening}
                    type="button"
                    className="w-[36px] h-[36px] md:w-[48px] md:h-[48px] bg-white text-purple-500 rounded-full flex justify-center items-center shadow-md transform transition hover:scale-105"
                    aria-label="Voice Input"
                  >
                    <span className="material-symbols-outlined text-base md:text-xl">
                      <Mic size={24} />
                    </span>
                  </button>
                )}
              </>
            )}
          </div>
          <label
            htmlFor="log-date"
            className="text-base md:text-lg text-neutral-50 font-medium text-center mt-2"
          >
            Select Date
          </label>
          <div className="flex items-center gap-2 md:gap-3 border border-neutral-50 rounded-full px-3 md:px-4 py-2 bg-gradient-to-r from-white/30 to-white/10 backdrop-blur-lg shadow-sm">
            <input
              value={inputDate}
              onChange={(e) => setInputDate(e.target.value)}
              disabled={isSending}
              id="log-date"
              type="date"
              className="flex-1 text-neutral-950 text-sm md:text-lg outline-none bg-transparent placeholder:text-neutral-400"
            />
          </div>
          {editingLog ? (
            <>
              <button
                onClick={updateLog}
                className="p-3 bg-green-500 text-white rounded-full hover:opacity-80 transition"
              >
                <Check size={24} />
              </button>
              <button
                onClick={() => cancelEdit()}
                className="p-3 bg-red-500 text-white rounded-full hover:opacity-80 transition"
              >
                <X size={24} />
              </button>
            </>
          ) : (
            <button
              onClick={submitLog}
              disabled={!inputText.trim() || isSending}
              type="submit"
              className={` ${
                !inputText.trim() || isSending
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-white hover:opacity-80"
              } w-full bg-white text-purple-500 py-2 md:py-3 rounded-full text-sm md:text-lg font-title font-semibold shadow-md transform transition hover:scale-105`}
            >
              Add Log
            </button>
          )}
        </form>
        <section className="flex flex-col gap-4 md:gap-6">
          <h2 className="text-xl md:text-2xl font-title text-neutral-50 font-bold">
            Today&apos;s Logs
          </h2>
          <ul className="flex flex-col gap-3 md:gap-4">
            {logs.length === 0 ? (
              <li className="flex flex-col bg-white rounded-md p-3 md:p-4 shadow hover:shadow-lg transition relative">
                <p className="mt-1 text-center text-base md:text-xl text-neutral-950 font-medium">
                  No logs found
                </p>
              </li>
            ) : (
              logs.map((log, ind) => (
                <li
                  key={log.id+ind}
                  className="flex flex-col bg-white rounded-md p-3 md:p-4 shadow hover:shadow-lg transition relative"
                >
                  <span className="text-xs md:text-sm text-neutral-500">
                    {new Date(log.date).toISOString()?.split("T")[0]} -{" "}
                    {
                      new Date(log.timestamp)
                        .toISOString()
                        ?.split("T")[1]
                        .split(".")[0]
                    }
                  </span>
                  <p className="mt-1 text-base md:text-xl text-neutral-950 font-medium">
                    {log.content}
                  </p>
                  <div className="flex gap-2 absolute top-3 right-3">
                    <button
                      onClick={() => startEditLog(log)}
                      className="w-[24px] h-[24px] bg-purple-500 text-white rounded-full flex justify-center items-center hover:bg-purple-600"
                      aria-label="Edit Log"
                    >
                      <span className="material-symbols-outlined text-sm">
                        <Edit size={12} />
                      </span>
                    </button>
                    <button
                      onClick={() => deleteLog(log._id)}
                      className="w-[24px] h-[24px] bg-red-500 text-white rounded-full flex justify-center items-center hover:bg-red-600"
                      aria-label="Delete Log"
                    >
                      <span className="material-symbols-outlined text-sm">
                        <Trash2 size={12} />
                      </span>
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
          <button
            type="button"
            className="self-end bg-white text-purple-500 py-2 px-4 md:py-3 md:px-6 rounded-full text-sm md:text-lg font-title font-semibold shadow-md transform transition hover:scale-105"
          >
            Print Logs
          </button>
        </section>
      </div>
    </div>
  );
}
