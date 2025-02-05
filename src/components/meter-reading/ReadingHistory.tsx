"use client";

import { Zap, Droplets, Camera } from "lucide-react";
import Image from "next/image";

interface Reading {
  id: string;
  type: "electricity" | "water";
  roomNumber: string;
  dormitoryName: string;
  previousReading: number;
  currentReading: number;
  unitsUsed: number;
  readingDate: string;
  readByName: string;
  photoUrl?: string;
}

export default function ReadingHistory() {
  // ตัวอย่างข้อมูล (จะถูกแทนที่ด้วยข้อมูลจริงจาก Firebase)
  const readings: Reading[] = [
    {
      id: "1",
      type: "electricity",
      roomNumber: "101",
      dormitoryName: "หอพักสุขสบาย 1",
      previousReading: 1234,
      currentReading: 1384,
      unitsUsed: 150,
      readingDate: "1 มีนาคม 2567",
      readByName: "สมชาย ใจดี",
      photoUrl: "/meter-photo.jpg",
    },
    {
      id: "2",
      type: "water",
      roomNumber: "102",
      dormitoryName: "หอพักสุขสบาย 1",
      previousReading: 2345,
      currentReading: 2363,
      unitsUsed: 18,
      readingDate: "1 มีนาคม 2567",
      readByName: "สมชาย ใจดี",
    },
    {
      id: "3",
      type: "electricity",
      roomNumber: "201",
      dormitoryName: "หอพักสุขสบาย 2",
      previousReading: 3456,
      currentReading: 3556,
      unitsUsed: 100,
      readingDate: "1 มีนาคม 2567",
      readByName: "สมหญิง รักดี",
      photoUrl: "/meter-photo.jpg",
    },
  ];

  return (
    <div className="overflow-hidden">
      <div className="flow-root">
        <ul role="list" className="-mb-8">
          {readings.map((reading, readingIdx) => (
            <li key={reading.id}>
              <div className="relative pb-8">
                {readingIdx !== readings.length - 1 ? (
                  <span
                    className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200"
                    aria-hidden="true"
                  />
                ) : null}
                <div className="relative flex space-x-3">
                  <div>
                    <span
                      className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                        reading.type === "electricity"
                          ? "bg-yellow-100"
                          : "bg-blue-100"
                      }`}
                    >
                      {reading.type === "electricity" ? (
                        <Zap className="h-5 w-5 text-yellow-600" />
                      ) : (
                        <Droplets className="h-5 w-5 text-blue-600" />
                      )}
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 justify-between space-x-4">
                    <div>
                      <p className="text-sm text-gray-500">
                        <span className="font-medium text-gray-900">
                          {reading.dormitoryName} ห้อง {reading.roomNumber}
                        </span>{" "}
                        - {reading.readByName}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        ค่ามิเตอร์: {reading.previousReading} →{" "}
                        {reading.currentReading} ({reading.unitsUsed} หน่วย)
                      </p>
                      {reading.photoUrl && (
                        <div className="mt-2 flex items-center">
                          <Camera className="h-4 w-4 text-gray-400" />
                          <button
                            type="button"
                            className="ml-1 text-sm text-blue-600 hover:text-blue-500"
                            onClick={() => {
                              // TODO: แสดงรูปภาพแบบ modal
                            }}
                          >
                            ดูรูปภาพ
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="whitespace-nowrap text-right text-sm text-gray-500">
                      {reading.readingDate}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
} 