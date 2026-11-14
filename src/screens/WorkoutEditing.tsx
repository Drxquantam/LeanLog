import type { BlockId, LogDay, Prescription, TemplateId } from '../lib/types';
import { useStore } from '../lib/store';
import { TEMPLATES, blockItems, exerciseName, isTimed } from '../lib/program';
import { Icon } from '../components/Icon';
import { Sheet } from '../components/ui';
import { ExercisePicker } from '../components/ExercisePicker';

export type EditTarget = { block: BlockId; exerciseId: string };
export type PickTarget = { block: BlockId; replace?: string };

const blockName = (block: BlockId) => (block === 'ABS' ? 'abs block' : TEMPLATES[block].name);

/**
 * Edit an exercise from inside a day's workout: swap it, change sets and target, or remove it.
 * Changes apply to this workout from now on (every day this workout comes round in the rotation).
 */
export function WorkoutEditing({ date, templateId, edit, pick, onEdit, onPick }: {
  date: string;
  templateId: TemplateId;
  edit: EditTarget | null;
  pick: PickTarget | null;
  onEdit: (t: EditTarget | null) => void;
  onPick: (t: PickTarget | null) => void;
}) {
  const { settings, updateSettings, updateLog } = useStore();

  const save = (block: BlockId, list: Prescription[]) => updateSettings({ program: { ...settings.program, [block]: list } });

  const items = edit ? blockItems(edit.block) : [];
  const index = edit ? items.findIndex((x) => x.exerciseId === edit.exerciseId) : -1;
  const p = index >= 0 ? items[index] : undefined;
  const patch = (changes: Partial<Prescription>) => {
    if (!edit || index < 0) return;
    save(edit.block, items.map((x, j) => (j === index ? { ...x, ...changes } : x)));
    const n = changes.sets;
    if (n === undefined) return;
    // Today's rows follow the new set count: add blank rows, or drop trailing empty ones.
    updateLog(date, (l: LogDay) => {
      const rows = l.ex[edit.exerciseId];
      if (!rows) return l;
      let next = [...rows];
      while (next.length < n) next.push({ w: null, r: null });
      while (next.length > n && next[next.length - 1]?.w === null && next[next.length - 1]?.r === null) next = next.slice(0, -1);
      return { ...l, ex: { ...l.ex, [edit.exerciseId]: next } };
    });
  };

  const applyPick = (exId: string) => {
    if (!pick) return;
    const list = blockItems(pick.block);
    const defTarget = isTimed(exId) ? '30 sec' : '8-12';
    if (pick.replace) {
      const old = pick.replace;
      save(pick.block, list.map((x) => (x.exerciseId === old ? { ...x, exerciseId: exId, target: isTimed(exId) === isTimed(old) ? x.target : defTarget } : x)));
      // Sets already entered today follow the exercise to its new name.
      updateLog(date, (l: LogDay) => {
        const sets = l.ex[old];
        if (!sets || l.ex[exId]) return l;
        const ex = { ...l.ex, [exId]: sets };
        delete ex[old];
        return { ...l, ex };
      });
    } else {
      save(pick.block, [...list, { exerciseId: exId, sets: 3, target: defTarget }]);
    }
  };

  const pickExclude = new Set(pick ? blockItems(pick.block).map((x) => x.exerciseId) : []);
  const tplName = TEMPLATES[templateId].name;

  return (
    <>
      <Sheet open={!!edit && !!p} onClose={() => onEdit(null)} title="Edit exercise">
        {edit && p && (
          <div className="space-y-5">
            <div>
              <div className="eyebrow mb-1.5">Exercise</div>
              <button
                type="button"
                onClick={() => {
                  onEdit(null);
                  onPick({ block: edit.block, replace: p.exerciseId });
                }}
                className="flex w-full min-h-[52px] items-center justify-between gap-3 rounded-xl bg-raised px-4 text-left"
              >
                <span className="font-semibold">{exerciseName(p.exerciseId)}</span>
                <span className="flex items-center gap-1 text-[13.5px] font-medium text-accent"><Icon name="swap" size={16} /> Change</span>
              </button>
            </div>

            <div className="flex items-end gap-3">
              <div>
                <div className="eyebrow mb-1.5">Sets</div>
                <div className="flex items-center rounded-xl bg-raised" role="group" aria-label="Sets">
                  <button type="button" className="grid h-12 w-12 place-items-center text-muted disabled:opacity-30" disabled={p.sets <= 1} onClick={() => patch({ sets: p.sets - 1 })} aria-label="Fewer sets">
                    <Icon name="minus" size={18} />
                  </button>
                  <span className="display min-w-[36px] text-center text-[24px] font-semibold" aria-live="polite">{p.sets}</span>
                  <button type="button" className="grid h-12 w-12 place-items-center text-muted disabled:opacity-30" disabled={p.sets >= 10} onClick={() => patch({ sets: p.sets + 1 })} aria-label="More sets">
                    <Icon name="plus" size={18} />
                  </button>
                </div>
              </div>
              <label className="flex-1 min-w-0">
                <span className="eyebrow mb-1.5 block">{isTimed(p.exerciseId) ? 'Target time' : 'Target reps'}</span>
                <input value={p.target} maxLength={20} onChange={(e) => patch({ target: e.target.value })} placeholder={isTimed(p.exerciseId) ? '45 sec' : '8-10'} className="field !h-12" />
              </label>
            </div>

            <p className="text-[12.5px] text-muted">
              Saved straight away for every <span className="text-fg font-medium">{blockName(edit.block)}</span> day from now on. Sets you already logged are always kept.
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                className="btn-outline flex-1"
                onClick={() => {
                  save(edit.block, items.filter((_, j) => j !== index));
                  onEdit(null);
                }}
              >
                <Icon name="close" size={18} /> Remove
              </button>
              <button type="button" className="btn-primary flex-1" onClick={() => onEdit(null)}>Done</button>
            </div>
          </div>
        )}
      </Sheet>

      <ExercisePicker
        open={!!pick}
        title={pick?.replace ? 'Change exercise' : pick?.block === 'ABS' ? 'Add to abs' : `Add to ${tplName}`}
        exclude={pickExclude}
        onClose={() => onPick(null)}
        onPick={applyPick}
      />
    </>
  );
}
