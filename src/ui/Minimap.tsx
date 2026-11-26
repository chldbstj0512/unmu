import { useEffect, useRef, useSyncExternalStore } from "react";
import { bridge, getWorldSnap, subscribeWorld } from "../experience/bridge.ts";
import { travelTo } from "../study/store.ts";
import { BUILDINGS, COMPOUND, POND, SPOTS, floorAabb } from "../world/layout.ts";

const X0 = -20;
const X1 = 20;
const Z0 = -20;
const Z1 = 22;

function mx(x: number) {
  return ((x - X0) / (X1 - X0)) * 100;
}

function my(z: number) {
  return ((z - Z0) / (Z1 - Z0)) * 100;
}

export function Minimap() {
  const arrow = useRef<SVGPolygonElement>(null);
  const place = useSyncExternalStore(subscribeWorld, () => getWorldSnap().place, () => "마당");

  useEffect(() => {
    let frame = 0;
    const draw = () => {
      const node = arrow.current;
      if (node) {
        const { x, z, yaw } = bridge.player;
        node.setAttribute("transform", `translate(${mx(x)} ${my(z)}) rotate(${(-yaw * 180) / Math.PI})`);
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="relative h-40 w-40 sm:h-52 sm:w-52">
      <svg viewBox="0 0 100 100" className="h-full w-full rounded-2xl border border-white/20 bg-black/35 backdrop-blur-md">
        <rect
          x={mx(COMPOUND.minX)}
          y={my(COMPOUND.minZ)}
          width={mx(COMPOUND.maxX) - mx(COMPOUND.minX)}
          height={my(COMPOUND.maxZ) - my(COMPOUND.minZ)}
          fill="rgba(232, 214, 186, 0.16)"
          stroke="rgba(246, 239, 226, 0.45)"
          strokeWidth="0.6"
        />
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
          rx={(POND.rx / (X1 - X0)) * 100}
          ry={(POND.rz / (Z1 - Z0)) * 100}
          fill="rgba(40, 90, 96, 0.85)"
        />
        <polygon ref={arrow} points="0,-3.4 2.2,2.6 -2.2,2.6" fill="#f6efe2" />
        <text x="50" y="6" textAnchor="middle" fill="#f6efe2" fontSize="5">
          북
        </text>
      </svg>
      {SPOTS.map((spot) => (
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
  );
}
