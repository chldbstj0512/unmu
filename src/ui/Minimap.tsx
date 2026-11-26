import { useEffect, useRef, useSyncExternalStore } from "react";
import { bridge, getWorldSnap, subscribeWorld } from "../experience/bridge.ts";
import { travelTo } from "../study/store.ts";
import { BUILDINGS, COMPOUND, PLAZA, POND, SPOTS, floorAabb, type Spot } from "../world/layout.ts";

const HOME = { x0: -20, x1: 20, z0: -20, z1: 22 };
const SOUTH = { x0: -18, x1: 18, z0: 18, z1: 54 };

function project(range: typeof HOME) {
  const mx = (x: number) => ((x - range.x0) / (range.x1 - range.x0)) * 100;
  const my = (z: number) => ((z - range.z0) / (range.z1 - range.z0)) * 100;
  return { mx, my };
}

function onMap(spot: Spot, mx: (x: number) => number, my: (z: number) => number) {
  const left = mx(spot.x);
  const top = my(spot.z);
  return left >= 3 && left <= 97 && top >= 4 && top <= 96;
}

export function Minimap() {
  const arrow = useRef<SVGPolygonElement>(null);
  const place = useSyncExternalStore(subscribeWorld, () => getWorldSnap().place, () => "마당");
  const south = place === "광장" || place === "길";
  const range = south ? SOUTH : HOME;
  const { mx, my } = project(range);
  const jump = south ? SPOTS.find((spot) => spot.id === "yard") : SPOTS.find((spot) => spot.id === "plaza");

  useEffect(() => {
    let frame = 0;
    const draw = () => {
      const node = arrow.current;
      if (node) {
        const { x, z, yaw } = bridge.player;
        const here = project(range);
        node.setAttribute("transform", `translate(${here.mx(x)} ${here.my(z)}) rotate(${(-yaw * 180) / Math.PI})`);
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [range]);

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="relative h-40 w-40 sm:h-52 sm:w-52">
        <svg viewBox="0 0 100 100" className="h-full w-full overflow-hidden rounded-2xl border border-white/20 bg-black/35 backdrop-blur-md">
          <rect
            x={mx(COMPOUND.minX)}
            y={my(COMPOUND.minZ)}
            width={mx(COMPOUND.maxX) - mx(COMPOUND.minX)}
            height={my(COMPOUND.maxZ) - my(COMPOUND.minZ)}
            fill="rgba(232, 214, 186, 0.16)"
            stroke="rgba(246, 239, 226, 0.45)"
            strokeWidth="0.6"
          />
          {south ? (
            <ellipse
              cx={mx(PLAZA.x)}
              cy={my(PLAZA.z)}
              rx={(PLAZA.r / (range.x1 - range.x0)) * 100}
              ry={(PLAZA.r / (range.z1 - range.z0)) * 100}
              fill="rgba(232, 214, 186, 0.2)"
              stroke="rgba(246, 239, 226, 0.4)"
              strokeWidth="0.5"
            />
          ) : null}
          {BUILDINGS.map((item) => {
            const floor = floorAabb(item);
            return (
              <rect
                key={item.id}
                x={mx(floor.minX)}
                y={my(floor.minZ)}
                width={mx(floor.maxX) - mx(floor.minX)}
                height={my(floor.maxZ) - my(floor.minZ)}
                fill="rgba(92, 58, 36, 0.9)"
              />
            );
          })}
          <ellipse
            cx={mx(POND.x)}
            cy={my(POND.z)}
            rx={(POND.rx / (range.x1 - range.x0)) * 100}
            ry={(POND.rz / (range.z1 - range.z0)) * 100}
            fill="rgba(40, 90, 96, 0.85)"
          />
          <polygon ref={arrow} points="0,-3.4 2.2,2.6 -2.2,2.6" fill="#f6efe2" />
          <text x="50" y="6" textAnchor="middle" fill="#f6efe2" fontSize="5">
            북
          </text>
        </svg>
        {SPOTS.filter((spot) => onMap(spot, mx, my)).map((spot) => (
          <button
            key={spot.id}
            type="button"
            title={spot.name}
            aria-label={spot.key ? `${spot.key} ${spot.name}` : spot.name}
            className={`absolute grid h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border text-[8px] leading-none ${
              place === spot.name ? "border-[#f6efe2] bg-[#7a2e2a] text-[#f6efe2]" : "border-[#f6efe2]/70 bg-black/55 text-[#f6efe2]"
            }`}
            style={{ left: `${mx(spot.x)}%`, top: `${my(spot.z)}%` }}
            onClick={() => travelTo(spot)}
          >
            {spot.key || "문"}
          </button>
        ))}
      </div>
      {jump ? (
        <button
          type="button"
          className="rounded-md border border-white/25 bg-black/35 px-2.5 py-1 text-xs text-[#f6efe2] backdrop-blur-md"
          onClick={() => travelTo(jump)}
        >
          {jump.key} {jump.name}
        </button>
      ) : null}
    </div>
  );
}
