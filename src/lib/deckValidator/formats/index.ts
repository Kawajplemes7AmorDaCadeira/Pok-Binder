import { FormatRuleset } from '../types';
import { StandardFormat, RotationFormat, ExpandedFormat, PocketFormat } from './standard.format';

export * from './standard.format';

const FORMAT_REGISTRY: Record<string, FormatRuleset> = {
  standard: StandardFormat,
  rotation: RotationFormat,
  expanded: ExpandedFormat,
  pocket: PocketFormat,
};

export function getFormatRuleset(formatName?: string): FormatRuleset {
  if (!formatName) return StandardFormat;
  const key = formatName.toLowerCase().trim();
  return FORMAT_REGISTRY[key] || StandardFormat;
}
