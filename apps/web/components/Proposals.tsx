"use client";
import React, { useState, useEffect } from "react";

export function Proposals() {
  const [editView, setEditView] = useState(false);
  const [distributedPoints, setDistributedPoints] = useState(0);
  const [inputs, setInputs] = useState(
    proposalsItems.map(({ id, value }) => ({ id: id, value: value })),
  );

  useEffect(() => {
    setDistributedPoints(calculatePoints());
  }, []);

  const submit = () => {
    console.log(inputs);
  };

  const inputHandler = (i: number, value: number) => {
    const currentPoints = calculatePoints(i);
    if (currentPoints + value <= 100) {
      setInputs(
        inputs.map((input, index) =>
          index === i ? { ...input, value: value } : input,
        ),
      );
      setDistributedPoints(currentPoints + value);
    } else console.log("can't exceed 100% points");
  };

  const calculatePoints = (exceptIndex?: number) =>
    inputs.reduce((acc, curr, i) => {
      if (exceptIndex !== undefined && exceptIndex === i) return acc;
      else return acc + curr.value;
    }, 0);

  return (
    <section className="rounded-lg border-2 border-black bg-white p-16">
      {/* points */}
      <div></div>

      {/* proposals: title - proposals -create button */}
      <div className="mx-auto max-w-3xl space-y-10">
        <header className="flex items-center justify-between">
          <h3 className="">Proposals</h3>
          {editView && <div>Total distributed: {distributedPoints} %</div>}
        </header>
        <div className="flex flex-col gap-6">
          {proposalsItems.map(({ label, color, type }, i) => (
            <div
              className="flex flex-col justify-between gap-4 rounded-lg bg-surface p-4"
              key={i}
            >
              <div className="flex w-full items-center justify-between">
                <span className="font-semibold">{label}</span>
                <span className={`badge w-28 p-4 font-semibold bg-${color}`}>
                  {type}
                </span>
              </div>

              {editView && (
                <div className="flex items-center gap-8">
                  <div>
                    <input
                      key={i}
                      type="range"
                      min={0}
                      max={100}
                      value={inputs[i].value}
                      // className={`range range-${color} range-sm min-w-[420px]`}
                      className={`range range-sm min-w-[420px]`}
                      step="5"
                      onChange={(e) => inputHandler(i, Number(e.target.value))}
                    />
                    <div className="flex w-full justify-between px-[10px] text-[4px]">
                      {[...Array(21)].map((_, i) => (
                        <span key={i}>|</span>
                      ))}
                    </div>
                  </div>
                  <div className="mb-2">
                    {/* <input
                      type="number"
                      // placeholder="Type here"
                      className="input input-bordered w-20"
                    /> */}
                    {inputs[i].value} %
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-8">
          <button className="btn btn-primary">Create Proposal</button>
          <button
            className="btn btn-accent"
            onClick={() => setEditView((prev) => !prev)}
          >
            Manage support
          </button>
          {editView && (
            <button className="btn" onClick={() => submit()}>
              Submit
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

const proposalsItems = [
  {
    label: "Buy a billboard in Times Square",
    type: "Funding",
    color: "primary",
    value: 10,
    id: 0,
  },
  {
    label: "Zack active contributor",
    type: "Streaming",
    color: "secondary",
    value: 45,
    id: 1,
  },
  {
    label: "Current signaling proposal",
    type: "Signaling",
    color: "accent",
    value: 25,
    id: 2,
  },
];
