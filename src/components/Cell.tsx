// Клетка поля. В оригинале — readonly-input, здесь достаточно кнопки:
// значение хранится в состоянии, а не в DOM.
interface CellProps {
  letter: string;
  inTrack: boolean;   // клетка в пути — подсветка .select
  isNew: boolean;     // клетка с добавленной буквой — подсветка .add
  isSelected: boolean; // выбранная пустая клетка в фазе letter
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
