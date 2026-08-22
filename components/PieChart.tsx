import Svg, { Circle, Path } from 'react-native-svg';

export type PieSlice = {
  key: string;
  value: number;
  color: string;
};

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
}

type Props = {
  data: PieSlice[];
  size: number;
  gapColor: string;
};

export default function PieChart({ data, size, gapColor }: Props) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = size / 2;

  if (total <= 0) {
    return null;
  }

  let cumulativeAngle = 0;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {data.map((slice) => {
        const sliceAngle = (slice.value / total) * 360;
        const startAngle = cumulativeAngle;
        const endAngle = cumulativeAngle + sliceAngle;
        cumulativeAngle = endAngle;

        if (sliceAngle >= 359.99) {
          return <Circle key={slice.key} cx={radius} cy={radius} r={radius} fill={slice.color} />;
        }

        return (
          <Path
            key={slice.key}
            d={arcPath(radius, radius, radius, startAngle, endAngle)}
            fill={slice.color}
            stroke={gapColor}
            strokeWidth={2}
          />
        );
      })}
    </Svg>
  );
}
