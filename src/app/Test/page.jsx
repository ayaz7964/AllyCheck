"use client";
import { useState } from "react";

export default function Page() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center">
      
      <button
        onClick={() => setOpen(true)}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg"
      >
        Start Test
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-80">
            <h2 className="text-lg font-semibold mb-3">Test Instructions</h2>
            <p className="text-sm text-gray-600 mb-4">
              Time limit 30 minutes. No refresh.
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-green-600 text-white rounded">
                Begin
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
