class MathUtil {
  static ceilToNearest(value, nearest) {
    return Math.ceil(value / nearest) * nearest;
  }

  static clamp(value, min, max) {
    const minCheckValue = Math.min(value, max);
    const maxCheckValue = Math.max(minCheckValue, min);
    return maxCheckValue;
  }

  static distance(x1, y1, x2, y2) {
    const y = x2 - x1;
    const x = y2 - y1;
    return Math.sqrt(x * x + y * y);
  }

  static ease(n) {
    return (Math.sin((n + 1.5) * Math.PI) + 1.0) / 2.0;
  }

  static floorToNearest(value, nearest) {
    return Math.floor(value / nearest) * nearest;
  }

  static lerp(a, b, percent) {
    return (1.0 * b - a) * percent + a;
  }

  static mod(n, m) {
    return ((n % m) + m) % m;
  }

  static norm(value, a, b) {
    const denom = (b - a);
    if (denom > 0 || denom < 0) return (1.0 * value - a) / denom;
    return 0;
  }

  static pad(num, size, padWith = '0') {
    return String(num).padStart(size, padWith);
  }

  // range: (-PI, PI]
  // 3 o'clock is zero
  // clockwise goes to PI
  // counter-clockwise goes to -PI
  static radiansBetweenPoints(x1, y1, x2, y2) {
    const dy = y2 - y1;
    const dx = x2 - x1;
    return Math.atan2(dy, dx);
  }

  static round(value, precision) {
    return Number(value).toFixed(precision);
  }

  static roundToNearest(value, nearest) {
    return Math.round(value / nearest) * nearest;
  }

  static within(num, min, max) {
    return (num >= min && num <= max);
  }

  static wrap(num, min, max) {
    if (num >= min && num < max) return num;
    const delta = max - min;
    if (delta < 1) return 0;
    if (num < min) return max - ((min - num) % delta);
    return ((num - min) % delta) + min;
  }
}
