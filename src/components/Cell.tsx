// A board cell. In the original it was a readonly input; a button is enough here:
// the value lives in state, not in the DOM.
interface CellProps {
  letter: string;
  inTrack: boolean;          // the cell is in the path — highlighted .select
  trackNumber: number | null; // 1-based position in the path, shown on the cell
  isNew: boolean;            // the cell with the added letter — highlighted .add
  isSelected: boolean;       // the cell the letter keyboard is anchored to: the chosen empty cell (letter phase) or the added letter being changed (word phase)
  bot: boolean;              // on the highlighted path of the computer's move
  botNew: boolean;           // the letter cell added by the computer
  disabled?: boolean;        // an empty cell with no letters around — not a legal spot
  onClick: () => void;
}

export function Cell({ letter, inTrack, trackNumber, isNew, isSelected, bot, botNew, disabled, onClick }: CellProps) {
  const classes = ['cell'];
  if (bot) classes.push('bot');
  if (botNew) classes.push('bot-new');
  if (inTrack) classes.push('select');
  if (isNew) classes.push('add');
  if (isSelected) classes.push('selected');
  return (
    <button type="button" className={classes.join(' ')} onClick={onClick} disabled={disabled}>
      {letter}
      {trackNumber !== null && <span className="cell-num">{trackNumber}</span>}
    </button>
  );
}
