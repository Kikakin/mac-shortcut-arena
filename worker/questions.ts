export type Question = { id: number; en: string; zh: string; shortcut: string };
// Apple macOS keyboard shortcuts and Finder shortcuts, checked against Apple's current guide.
export const questions: Question[] = [
  {id:1,en:'Copy the selected item',zh:'复制所选项目',shortcut:'⌘ C'},
  {id:2,en:'Paste from the clipboard',zh:'粘贴剪贴板内容',shortcut:'⌘ V'},
  {id:3,en:'Cut selected text',zh:'剪切所选文本',shortcut:'⌘ X'},
  {id:4,en:'Undo the previous action',zh:'撤销上一步操作',shortcut:'⌘ Z'},
  {id:5,en:'Redo the previous action',zh:'重做上一步操作',shortcut:'⇧ ⌘ Z'},
  {id:6,en:'Select all items or text',zh:'全选项目或文本',shortcut:'⌘ A'},
  {id:7,en:'Find items in a document',zh:'在文稿中查找内容',shortcut:'⌘ F'},
  {id:8,en:'Find the next occurrence',zh:'查找下一处匹配内容',shortcut:'⌘ G'},
  {id:9,en:'Find the previous occurrence',zh:'查找上一处匹配内容',shortcut:'⇧ ⌘ G'},
  {id:10,en:'Open a new Finder window',zh:'打开新的访达窗口',shortcut:'⌘ N'},
  {id:11,en:'Close the front window',zh:'关闭最前面的窗口',shortcut:'⌘ W'},
  {id:12,en:'Quit the current app',zh:'退出当前应用',shortcut:'⌘ Q'},
  {id:13,en:'Switch to the next open app',zh:'切换到下一个打开的应用',shortcut:'⌘ Tab'},
  {id:14,en:'Open Spotlight search',zh:'打开聚焦搜索',shortcut:'⌘ Space'},
  {id:15,en:'Capture the entire screen',zh:'截取整个屏幕',shortcut:'⇧ ⌘ 3'},
  {id:16,en:'Capture a selected portion of the screen',zh:'截取屏幕选定区域',shortcut:'⇧ ⌘ 4'},
  {id:17,en:'Open the screenshot toolbar',zh:'打开截屏工具栏',shortcut:'⇧ ⌘ 5'},
  {id:18,en:'Lock your Mac screen',zh:'锁定 Mac 屏幕',shortcut:'⌃ ⌘ Q'},
  {id:19,en:'Open the emoji and symbols viewer',zh:'打开表情与符号检视器',shortcut:'⌃ ⌘ Space'},
  {id:20,en:'Open the Force Quit window',zh:'打开强制退出窗口',shortcut:'⌥ ⌘ Esc'},
  {id:21,en:'Hide the front app',zh:'隐藏最前面的应用',shortcut:'⌘ H'},
  {id:22,en:'Hide other apps',zh:'隐藏其他应用',shortcut:'⌥ ⌘ H'},
  {id:23,en:'Minimize the front window',zh:'最小化最前面的窗口',shortcut:'⌘ M'},
  {id:24,en:'Print the current document',zh:'打印当前文稿',shortcut:'⌘ P'},
  {id:25,en:'Save the current document',zh:'存储当前文稿',shortcut:'⌘ S'},
  {id:26,en:'Open the selected item in Finder',zh:'在访达中打开所选项目',shortcut:'⌘ O'},
  {id:27,en:'Create a new folder in Finder',zh:'在访达中新建文件夹',shortcut:'⇧ ⌘ N'},
  {id:28,en:'Open Go to Folder in Finder',zh:'在访达中打开“前往文件夹”',shortcut:'⇧ ⌘ G'},
  {id:29,en:'Move selected Finder items to the Trash',zh:'将访达所选项目移到废纸篓',shortcut:'⌘ Delete'},
  {id:30,en:'Empty the Trash in Finder',zh:'在访达中清倒废纸篓',shortcut:'⇧ ⌘ Delete'},
  {id:31,en:'Duplicate a selected Finder item',zh:'复制一份访达所选项目',shortcut:'⌘ D'},
  {id:32,en:'Quick Look a selected Finder item',zh:'快速查看访达所选项目',shortcut:'Space'},
  {id:33,en:'Show information for a Finder item',zh:'显示访达所选项目的信息',shortcut:'⌘ I'},
  {id:34,en:'Connect to a server from Finder',zh:'从访达连接服务器',shortcut:'⌘ K'},
  {id:35,en:'Open the Desktop folder in Finder',zh:'在访达中打开“桌面”文件夹',shortcut:'⇧ ⌘ D'},
  {id:36,en:'Open the Utilities folder in Finder',zh:'在访达中打开“实用工具”文件夹',shortcut:'⇧ ⌘ U'},
  {id:37,en:'Open the Downloads folder in Finder',zh:'在访达中打开“下载”文件夹',shortcut:'⌥ ⌘ L'},
  {id:38,en:'Show or hide the Dock',zh:'显示或隐藏程序坞',shortcut:'⌥ ⌘ D'},
  {id:39,en:'Open the Home folder in Finder',zh:'在访达中打开个人文件夹',shortcut:'⇧ ⌘ H'},
  {id:40,en:'Open the Computer window in Finder',zh:'在访达中打开“电脑”窗口',shortcut:'⇧ ⌘ C'}
];

export function pickQuestions(random: () => number = Math.random): Question[] {
  const pool = [...questions];
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, 10);
}

export function publicQuestions(selected: Question[]) {
  return selected.map((q, i) => {
    const distractors = questions.filter(x => x.shortcut !== q.shortcut);
    const choices = [q.shortcut, ...[0, 11, 23].map(n => distractors[(q.id * 7 + i * 13 + n) % distractors.length].shortcut)];
    // Preserve unique shortcuts even if distractor indices coincide.
    const unique = [q.shortcut, ...distractors.map(x => x.shortcut).filter((x, n, a) => a.indexOf(x) === n && x !== q.shortcut)].slice(0, 40);
    const safe = new Set(choices).size === 4 ? choices : [q.shortcut, ...unique.filter(x => x !== q.shortcut).slice(0, 3)];
    const rotation = (q.id + i) % 4;
    const rotated = [...safe.slice(rotation), ...safe.slice(0, rotation)];
    return { id: q.id, en: q.en, zh: q.zh, options: rotated };
  });
}

export function scoreAnswers(questionIds: number[], answers: (number | null)[]): number {
  return questionIds.reduce((score, id, i) => {
    const q = questions.find(item => item.id === id);
    if (!q || !Number.isInteger(answers[i]) || (answers[i] as number) < 0 || (answers[i] as number) > 3) return score;
    const publicQ = publicQuestions(questionIds.map(qid => questions.find(item => item.id === qid)!))[i];
    return score + Number(publicQ.options[answers[i] as number] === q.shortcut);
  }, 0);
}
