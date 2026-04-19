// Shared types and utility functions for EFI Boot Manager

export interface BootEntry {
  id: string;
  number: string;
  label: string;       // Clean name from efibootmgr (e.g. "Windows Boot Manager")
  efiPath: string;     // EFI file path (e.g. "\EFI\Microsoft\Boot\bootmgfw.efi")
  isActive: boolean;
}

export interface BootInfo {
  bootCurrent: string | null;
  bootNext: string | null;
  bootOrder: string[];
  entries: BootEntry[];
}

// Helper: clean label (remove path/GUID but keep original OS name)
export function cleanLabel(fullLabel: string): string {
  let name = fullLabel.split(/[\t\r\n]/)[0].trim();
  // Remove HD(...)/path, VenHw(...), and trailing hex data
  name = name.split(/\s+HD\(/)[0].trim();
  name = name.split(/\s+VenHw\(/)[0].trim();
  return name;
}

// Helper: get friendly display name
export function getDisplayName(label: string): string {
  if (label.toLowerCase().includes('windows boot manager')) {
    return 'Windows';
  }
  return label;
}

// Helper: extract EFI file path from raw label
// efibootmgr -v output format: HD(...)/\EFI\path\file.efi
export function extractEfiPath(fullLabel: string): string {
  // Match path after HD(...)/ or similar device path
  const match = fullLabel.match(/\)\/(.+?\.efi)/i);
  return match ? match[1] : '';
}

// Parse efibootmgr output
export function parseBootOutput(output: string): BootInfo | null {
  try {
    const lines = output.split('\n');
    let bootCurrent: string | null = null;
    let bootNext: string | null = null;
    let bootOrder: string[] = [];
    const entries: BootEntry[] = [];

    for (const line of lines) {
      const currentMatch = line.match(/BootCurrent:\s*(\d{4})/);
      if (currentMatch) bootCurrent = currentMatch[1];

      const nextMatch = line.match(/BootNext:\s*(\d{4})/);
      if (nextMatch) bootNext = nextMatch[1];

      const orderMatch = line.match(/BootOrder:\s*([\d,]+)/);
      if (orderMatch) bootOrder = orderMatch[1].split(',').map(s => s.trim());

      const entryMatch = line.match(/Boot(\d{4})(\*?)\s+(.+)/);
      if (entryMatch) {
        const rawLabel = entryMatch[3].trim();
        entries.push({
          id: entryMatch[1],
          number: entryMatch[1],
          label: cleanLabel(rawLabel),
          efiPath: extractEfiPath(rawLabel),
          isActive: entryMatch[2] === '*',
        });
      }
    }

    return { bootCurrent, bootNext, bootOrder, entries };
  } catch (e) {
    console.error("Failed to parse boot output:", e);
    return null;
  }
}
