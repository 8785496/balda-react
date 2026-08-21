// A board cell. In the original it was a readonly input; a button is enough here:
// the value lives in state, not in the DOM.
interface CellProps {
  letter: string;
  inTrack: boolean;   // the cell is in the path — highlighted .select
  isNew: boolean;     // the cell with the added letter — highlighted .add
  isSelected: boolean; // the selected empty cell in the letter phase
  onClick: () => void;
}

export function Cell({ letter, inTrack, isNew, isSelected, onClick }: CellProps) {
  const classes = ['cell'];
  if (inTrack) classes.push('select');
  if (isNew) classes.push('add');
  if (isSelected) classes.push('selected');
  return (
    <button type="button" className={classes.join(' ')} onClick={onClick}>
      {letter}
    </button>
  );
}
