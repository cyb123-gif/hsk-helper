/* ===== 翻译练习模块（技能练习 → 翻译练习） =====
   流程：输入汉语课文 → 对照原文翻译成母语 → 只看自己的母语翻译回中文 → AI 与原课文逐句对照。
   本文件独立加载，通过 window.trInit / trApplyLanguage / trOnShow / trReset 与主程序集成。 */

const I18N_NEW16 = {
    'Chinese': {
        'tr.tab': '📖 翻译练习',
        'tr.title': '📖 翻译练习：课文回译',
        'tr.desc': '输入要练习的汉语课文：① 先对照原文翻译成你的母语；② 再只看自己的母语翻译，把它写回中文；③ 最后 AI 逐句对照原文，检查你的回译是否对应。',
        'tr.source_label': '① 输入汉语课文',
        'tr.source_ph': '把要练习的汉语课文粘贴到这里（课文、文章、对话都可以）…',
        'tr.source_meta': '共 {chars} 字 · 约 {sents} 句 · 内容不保存，刷新页面后会清空',
        'tr.sample_btn': '📄 载入示例课文',
        'tr.start_btn': '🚀 开始练习',
        'tr.clear_btn': '🗑 清空',
        'tr.step1_title': '第一步：对照原文，翻译成你的母语',
        'tr.step1_hint': '把下面这篇课文翻译成{lang}。用自己的话，尽量把每个句子的意思都表达出来。',
        'tr.native_label': '✍️ 我的{lang}翻译',
        'tr.native_ph': '在这里写你的翻译…',
        'tr.to_back_btn': '✅ 翻译完成，下一步：写回中文',
        'tr.step2_title': '第二步：只看自己的翻译，写回中文',
        'tr.step2_hint': '不要看原文。根据你刚才写的{lang}翻译，把它翻译回中文。',
        'tr.peek_orig': '👁 偷看原文（尽量先自己写）',
        'tr.back_label': '✍️ 回译中文',
        'tr.back_ph': '在这里写回译的中文…',
        'tr.prev_btn': '⬅ 上一步',
        'tr.check_btn': '🔍 与原文对照检查',
        'tr.checking': '⏳ AI 正在逐句对照原文，请稍候…',
        'tr.check_fail': '⚠️ AI 对照失败，请检查 API Key。下面先给你原文与回译的并排对比。',
        'tr.result_title': '📊 对照结果',
        'tr.score_label': '对应度',
        'tr.native_fidelity': '你的母语翻译是否忠实于原文',
        'tr.verdict_match': '一致', 'tr.verdict_partial': '部分对应', 'tr.verdict_miss': '漏译', 'tr.verdict_extra': '多出', 'tr.verdict_wrong': '译错',
        'tr.th_orig': '原文句子', 'tr.th_back': '你的回译', 'tr.th_verdict': '判定', 'tr.th_note': 'AI 说明',
        'tr.extra_note': '（回译里多出的内容，原文没有）',
        'tr.again_btn': '🔁 用同一篇课文再练一次',
        'tr.new_btn': '📄 换一篇课文',
        'tr.edit_back_btn': '✍️ 修改回译',
        'tr.restart_btn': '🔄 重新开始',
        'tr.need_key': '🔑 请先填写 DeepSeek API Key',
        'tr.empty_source': '⚠️ 请先粘贴要练习的汉语课文',
        'tr.empty_native': '⚠️ 请先写出你的翻译',
        'tr.empty_back': '⚠️ 请先写回译的中文',
        'tr.too_long': '⚠️ 课文太长了，请控制在约 {n} 字以内再检查',
        'tr.ai_no_items': 'AI 没有返回逐句结果，下面给你并排对比。'
    },
    'English': {
        'tr.tab': '📖 Translation',
        'tr.title': '📖 Translation Practice: Back-Translation',
        'tr.desc': 'Paste a Chinese text to practice: ① translate it into your native language while looking at the original; ② using only your own translation, write it back in Chinese; ③ the AI then compares your back-translation with the original sentence by sentence.',
        'tr.source_label': '① Enter the Chinese text',
        'tr.source_ph': 'Paste the Chinese text you want to practice here (a lesson text, an article, a dialogue…)',
        'tr.source_meta': '{chars} characters · about {sents} sentences · nothing is saved; cleared on page refresh',
        'tr.sample_btn': '📄 Load sample text',
        'tr.start_btn': '🚀 Start',
        'tr.clear_btn': '🗑 Clear',
        'tr.step1_title': 'Step 1: Looking at the original, translate it into your native language',
        'tr.step1_hint': 'Translate the text below into {lang}. Use your own words and try to express the meaning of every sentence.',
        'tr.native_label': '✍️ My {lang} translation',
        'tr.native_ph': 'Write your translation here…',
        'tr.to_back_btn': '✅ Done — next: write it back in Chinese',
        'tr.step2_title': 'Step 2: Using only your translation, write it back in Chinese',
        'tr.step2_hint': 'Do not look at the original. Translate your {lang} text back into Chinese.',
        'tr.peek_orig': '👁 Peek at the original (try writing first)',
        'tr.back_label': '✍️ Back-translation (Chinese)',
        'tr.back_ph': 'Write the Chinese back here…',
        'tr.prev_btn': '⬅ Previous step',
        'tr.check_btn': '🔍 Check against the original',
        'tr.checking': '⏳ AI is comparing your text with the original sentence by sentence…',
        'tr.check_fail': '⚠️ AI check failed — please check your API key. A side-by-side view is shown below.',
        'tr.result_title': '📊 Comparison Result',
        'tr.score_label': 'Match',
        'tr.native_fidelity': 'How faithfully your native-language translation reflects the original',
        'tr.verdict_match': 'Match', 'tr.verdict_partial': 'Partial', 'tr.verdict_miss': 'Missing', 'tr.verdict_extra': 'Extra', 'tr.verdict_wrong': 'Wrong',
        'tr.th_orig': 'Original sentence', 'tr.th_back': 'Your back-translation', 'tr.th_verdict': 'Verdict', 'tr.th_note': 'AI note',
        'tr.extra_note': '(Extra content in your back-translation, not in the original)',
        'tr.again_btn': '🔁 Practice again with the same text',
        'tr.new_btn': '📄 Use a different text',
        'tr.edit_back_btn': '✍️ Edit back-translation',
        'tr.restart_btn': '🔄 Restart',
        'tr.need_key': '🔑 Please enter your DeepSeek API key first',
        'tr.empty_source': '⚠️ Please paste the Chinese text first',
        'tr.empty_native': '⚠️ Please write your translation first',
        'tr.empty_back': '⚠️ Please write the Chinese back-translation first',
        'tr.too_long': '⚠️ The text is too long — keep it under about {n} characters before checking',
        'tr.ai_no_items': 'The AI did not return sentence-by-sentence results; a side-by-side view is shown below.'
    },
    'Japanese': {
        'tr.tab': '📖 翻訳練習',
        'tr.title': '📖 翻訳練習：逆翻訳',
        'tr.desc': '練習したい中国語の本文を入力します。① 原文を見ながら母語に翻訳 → ② 自分の翻訳だけを見て中国語に書き戻す → ③ AIが原文と一文ずつ照合します。',
        'tr.source_label': '① 中国語の本文を入力',
        'tr.source_ph': '練習したい中国語の本文をここに貼り付けます（本文・文章・会話など）…',
        'tr.source_meta': '{chars}字 · 約{sents}文 · 保存されません（更新すると消えます）',
        'tr.sample_btn': '📄 サンプルを読み込む',
        'tr.start_btn': '🚀 始める',
        'tr.clear_btn': '🗑 クリア',
        'tr.step1_title': 'ステップ1：原文を見ながら母語に翻訳',
        'tr.step1_hint': '下の本文を{lang}に翻訳してください。自分の言葉で、各文の意味をすべて表現しましょう。',
        'tr.native_label': '✍️ 私の{lang}訳',
        'tr.native_ph': 'ここに翻訳を書いてください…',
        'tr.to_back_btn': '✅ 翻訳完了・次へ：中国語に書き戻す',
        'tr.step2_title': 'ステップ2：自分の翻訳だけを見て中国語に書き戻す',
        'tr.step2_hint': '原文を見ないでください。先ほど書いた{lang}訳を中国語に翻訳し直してください。',
        'tr.peek_orig': '👁 原文をのぞき見（まず自分で書いてみよう）',
        'tr.back_label': '✍️ 中国語への書き戻し',
        'tr.back_ph': 'ここに中国語を書いてください…',
        'tr.prev_btn': '⬅ 前のステップ',
        'tr.check_btn': '🔍 原文と照合',
        'tr.checking': '⏳ AIが原文と一文ずつ照合しています…',
        'tr.check_fail': '⚠️ AIの照合に失敗しました。APIキーを確認してください。以下に原文と書き戻しを並べて表示します。',
        'tr.result_title': '📊 照合結果',
        'tr.score_label': '一致度',
        'tr.native_fidelity': '母語訳は原文に忠実か',
        'tr.verdict_match': '一致', 'tr.verdict_partial': '部分一致', 'tr.verdict_miss': '抜け', 'tr.verdict_extra': '余分', 'tr.verdict_wrong': '誤り',
        'tr.th_orig': '原文の文', 'tr.th_back': 'あなたの書き戻し', 'tr.th_verdict': '判定', 'tr.th_note': 'AIの説明',
        'tr.extra_note': '（書き戻しに余分に含まれる内容。原文にはありません）',
        'tr.again_btn': '🔁 同じ本文でもう一度',
        'tr.new_btn': '📄 別の本文にする',
        'tr.edit_back_btn': '✍️ 書き戻しを修正',
        'tr.restart_btn': '🔄 最初から',
        'tr.need_key': '🔑 先にDeepSeek APIキーを入力してください',
        'tr.empty_source': '⚠️ 先に中国語の本文を貼り付けてください',
        'tr.empty_native': '⚠️ 先に翻訳を書いてください',
        'tr.empty_back': '⚠️ 先に中国語の書き戻しを書いてください',
        'tr.too_long': '⚠️ 本文が長すぎます。約{n}字以内にしてから照合してください',
        'tr.ai_no_items': 'AIが一文ごとの結果を返しませんでした。並べて表示します。'
    },
    'Korean': {
        'tr.tab': '📖 번역 연습',
        'tr.title': '📖 번역 연습: 역번역',
        'tr.desc': '연습할 중국어 본문을 입력하세요. ① 원문을 보며 모국어로 번역 → ② 내 번역만 보고 중국어로 되돌려 쓰기 → ③ AI가 원문과 문장별로 대조합니다.',
        'tr.source_label': '① 중국어 본문 입력',
        'tr.source_ph': '연습할 중국어 본문을 여기에 붙여넣으세요（본문·기사·대화 모두 가능）…',
        'tr.source_meta': '{chars}자 · 약 {sents}문장 · 저장되지 않으며 새로고침하면 사라집니다',
        'tr.sample_btn': '📄 예시 본문 불러오기',
        'tr.start_btn': '🚀 시작',
        'tr.clear_btn': '🗑 지우기',
        'tr.step1_title': '1단계: 원문을 보며 모국어로 번역',
        'tr.step1_hint': '아래 본문을 {lang}로 번역하세요. 자기 말로 각 문장의 뜻을 모두 표현해 보세요.',
        'tr.native_label': '✍️ 내 {lang} 번역',
        'tr.native_ph': '여기에 번역을 쓰세요…',
        'tr.to_back_btn': '✅ 번역 완료 · 다음: 중국어로 되돌려 쓰기',
        'tr.step2_title': '2단계: 내 번역만 보고 중국어로 되돌려 쓰기',
        'tr.step2_hint': '원문을 보지 마세요. 방금 쓴 {lang} 번역을 중국어로 다시 번역하세요.',
        'tr.peek_orig': '👁 원문 몰래 보기（먼저 스스로 써 보세요）',
        'tr.back_label': '✍️ 되돌려 쓴 중국어',
        'tr.back_ph': '여기에 중국어를 쓰세요…',
        'tr.prev_btn': '⬅ 이전 단계',
        'tr.check_btn': '🔍 원문과 대조',
        'tr.checking': '⏳ AI가 원문과 문장별로 대조하고 있습니다…',
        'tr.check_fail': '⚠️ AI 대조에 실패했습니다. API 키를 확인하세요. 아래에 원문과 되돌려 쓴 문장을 나란히 보여드립니다.',
        'tr.result_title': '📊 대조 결과',
        'tr.score_label': '일치도',
        'tr.native_fidelity': '내 모국어 번역이 원문에 충실한가',
        'tr.verdict_match': '일치', 'tr.verdict_partial': '부분 일치', 'tr.verdict_miss': '누락', 'tr.verdict_extra': '추가', 'tr.verdict_wrong': '오류',
        'tr.th_orig': '원문 문장', 'tr.th_back': '되돌려 쓴 문장', 'tr.th_verdict': '판정', 'tr.th_note': 'AI 설명',
        'tr.extra_note': '（되돌려 쓴 문장에만 있는 내용으로 원문에는 없습니다）',
        'tr.again_btn': '🔁 같은 본문으로 다시 연습',
        'tr.new_btn': '📄 다른 본문으로',
        'tr.edit_back_btn': '✍️ 되돌려 쓴 문장 수정',
        'tr.restart_btn': '🔄 처음부터',
        'tr.need_key': '🔑 먼저 DeepSeek API 키를 입력하세요',
        'tr.empty_source': '⚠️ 먼저 중국어 본문을 붙여넣으세요',
        'tr.empty_native': '⚠️ 먼저 번역을 쓰세요',
        'tr.empty_back': '⚠️ 먼저 중국어 되돌려 쓰기를 작성하세요',
        'tr.too_long': '⚠️ 본문이 너무 깁니다. 약 {n}자 이내로 줄인 뒤 대조하세요',
        'tr.ai_no_items': 'AI가 문장별 결과를 반환하지 않았습니다. 나란히 비교해 보세요.'
    },
    'French': {
        'tr.tab': '📖 Traduction',
        'tr.title': '📖 Exercice de traduction : rétro-traduction',
        'tr.desc': "Collez un texte chinois à travailler : ① traduisez-le dans votre langue en regardant l'original ; ② en ne voyant que votre traduction, réécrivez-le en chinois ; ③ l'IA compare ensuite votre rétro-traduction avec l'original phrase par phrase.",
        'tr.source_label': '① Saisir le texte chinois',
        'tr.source_ph': 'Collez ici le texte chinois à travailler (leçon, article, dialogue…)',
        'tr.source_meta': "{chars} caractères · environ {sents} phrases · rien n'est enregistré ; effacé au rechargement",
        'tr.sample_btn': "📄 Charger un texte d'exemple",
        'tr.start_btn': '🚀 Commencer',
        'tr.clear_btn': '🗑 Effacer',
        'tr.step1_title': "Étape 1 : en regardant l'original, traduisez dans votre langue",
        'tr.step1_hint': 'Traduisez le texte ci-dessous en {lang}. Avec vos propres mots, exprimez le sens de chaque phrase.',
        'tr.native_label': '✍️ Ma traduction en {lang}',
        'tr.native_ph': 'Écrivez votre traduction ici…',
        'tr.to_back_btn': '✅ Terminé — ensuite : réécrire en chinois',
        'tr.step2_title': 'Étape 2 : avec votre seule traduction, réécrivez en chinois',
        'tr.step2_hint': "Ne regardez pas l'original. Retraduisez en chinois votre texte en {lang}.",
        'tr.peek_orig': "👁 Voir l'original (essayez d'abord par vous-même)",
        'tr.back_label': '✍️ Rétro-traduction (chinois)',
        'tr.back_ph': 'Écrivez le chinois ici…',
        'tr.prev_btn': '⬅ Étape précédente',
        'tr.check_btn': "🔍 Comparer avec l'original",
        'tr.checking': "⏳ L'IA compare avec l'original phrase par phrase…",
        'tr.check_fail': "⚠️ Échec de la vérification IA — vérifiez votre clé API. Vue côte à côte ci-dessous.",
        'tr.result_title': '📊 Résultat de la comparaison',
        'tr.score_label': 'Correspondance',
        'tr.native_fidelity': "Fidélité de votre traduction à l'original",
        'tr.verdict_match': 'Identique', 'tr.verdict_partial': 'Partiel', 'tr.verdict_miss': 'Manquant', 'tr.verdict_extra': 'En trop', 'tr.verdict_wrong': 'Faux',
        'tr.th_orig': 'Phrase originale', 'tr.th_back': 'Votre rétro-traduction', 'tr.th_verdict': 'Verdict', 'tr.th_note': "Note de l'IA",
        'tr.extra_note': "(Contenu en trop dans votre rétro-traduction, absent de l'original)",
        'tr.again_btn': '🔁 Recommencer avec le même texte',
        'tr.new_btn': '📄 Choisir un autre texte',
        'tr.edit_back_btn': '✍️ Modifier la rétro-traduction',
        'tr.restart_btn': '🔄 Recommencer',
        'tr.need_key': '🔑 Veuillez d’abord saisir votre clé API DeepSeek',
        'tr.empty_source': '⚠️ Collez d’abord le texte chinois',
        'tr.empty_native': '⚠️ Écrivez d’abord votre traduction',
        'tr.empty_back': '⚠️ Écrivez d’abord la rétro-traduction en chinois',
        'tr.too_long': "⚠️ Texte trop long — gardez-le sous {n} caractères environ avant la vérification",
        'tr.ai_no_items': "L'IA n'a pas renvoyé de résultat phrase par phrase ; vue côte à côte ci-dessous."
    },
    'German': {
        'tr.tab': '📖 Übersetzung',
        'tr.title': '📖 Übersetzungsübung: Rückübersetzung',
        'tr.desc': 'Füge einen chinesischen Text ein: ① übersetze ihn mit Blick auf das Original in deine Muttersprache; ② schreibe ihn nur anhand deiner eigenen Übersetzung wieder auf Chinesisch; ③ die KI vergleicht deine Rückübersetzung Satz für Satz mit dem Original.',
        'tr.source_label': '① Chinesischen Text eingeben',
        'tr.source_ph': 'Füge den zu übenden chinesischen Text hier ein (Lektion, Artikel, Dialog…)',
        'tr.source_meta': '{chars} Zeichen · ca. {sents} Sätze · nichts wird gespeichert; beim Neuladen gelöscht',
        'tr.sample_btn': '📄 Beispieltext laden',
        'tr.start_btn': '🚀 Starten',
        'tr.clear_btn': '🗑 Leeren',
        'tr.step1_title': 'Schritt 1: Mit Blick auf das Original in deine Muttersprache übersetzen',
        'tr.step1_hint': 'Übersetze den Text unten ins {lang}. Nutze deine eigenen Worte und gib die Bedeutung jedes Satzes wieder.',
        'tr.native_label': '✍️ Meine {lang}-Übersetzung',
        'tr.native_ph': 'Schreibe deine Übersetzung hier…',
        'tr.to_back_btn': '✅ Fertig — weiter: auf Chinesisch zurückschreiben',
        'tr.step2_title': 'Schritt 2: Nur mit deiner Übersetzung auf Chinesisch zurückschreiben',
        'tr.step2_hint': 'Schau nicht ins Original. Übersetze deinen {lang}-Text zurück ins Chinesische.',
        'tr.peek_orig': '👁 Ins Original schauen (erst selbst versuchen)',
        'tr.back_label': '✍️ Rückübersetzung (Chinesisch)',
        'tr.back_ph': 'Schreibe das Chinesische hier…',
        'tr.prev_btn': '⬅ Vorheriger Schritt',
        'tr.check_btn': '🔍 Mit dem Original vergleichen',
        'tr.checking': '⏳ Die KI vergleicht Satz für Satz mit dem Original…',
        'tr.check_fail': '⚠️ KI-Prüfung fehlgeschlagen — bitte API-Schlüssel prüfen. Unten siehst du einen direkten Vergleich.',
        'tr.result_title': '📊 Vergleichsergebnis',
        'tr.score_label': 'Übereinstimmung',
        'tr.native_fidelity': 'Wie treu deine Übersetzung das Original wiedergibt',
        'tr.verdict_match': 'Stimmt', 'tr.verdict_partial': 'Teilweise', 'tr.verdict_miss': 'Fehlt', 'tr.verdict_extra': 'Zusätzlich', 'tr.verdict_wrong': 'Falsch',
        'tr.th_orig': 'Originalsatz', 'tr.th_back': 'Deine Rückübersetzung', 'tr.th_verdict': 'Urteil', 'tr.th_note': 'KI-Hinweis',
        'tr.extra_note': '(Zusätzlicher Inhalt in deiner Rückübersetzung, der nicht im Original steht)',
        'tr.again_btn': '🔁 Noch einmal mit demselben Text',
        'tr.new_btn': '📄 Anderen Text verwenden',
        'tr.edit_back_btn': '✍️ Rückübersetzung bearbeiten',
        'tr.restart_btn': '🔄 Neu starten',
        'tr.need_key': '🔑 Bitte zuerst den DeepSeek-API-Schlüssel eingeben',
        'tr.empty_source': '⚠️ Bitte zuerst den chinesischen Text einfügen',
        'tr.empty_native': '⚠️ Bitte zuerst deine Übersetzung schreiben',
        'tr.empty_back': '⚠️ Bitte zuerst die chinesische Rückübersetzung schreiben',
        'tr.too_long': '⚠️ Der Text ist zu lang — vor der Prüfung auf ca. {n} Zeichen kürzen',
        'tr.ai_no_items': 'Die KI hat keine satzweisen Ergebnisse geliefert; unten ein direkter Vergleich.'
    },
    'Spanish': {
        'tr.tab': '📖 Traducción',
        'tr.title': '📖 Práctica de traducción: retrotraducción',
        'tr.desc': 'Pega un texto chino para practicar: ① tradúcelo a tu idioma mirando el original; ② usando solo tu traducción, escríbelo de nuevo en chino; ③ la IA compara tu retrotraducción con el original frase por frase.',
        'tr.source_label': '① Escribe el texto chino',
        'tr.source_ph': 'Pega aquí el texto chino que quieres practicar (lección, artículo, diálogo…)',
        'tr.source_meta': '{chars} caracteres · unas {sents} frases · no se guarda nada; se borra al recargar',
        'tr.sample_btn': '📄 Cargar texto de ejemplo',
        'tr.start_btn': '🚀 Empezar',
        'tr.clear_btn': '🗑 Borrar',
        'tr.step1_title': 'Paso 1: mirando el original, tradúcelo a tu idioma',
        'tr.step1_hint': 'Traduce el texto de abajo al {lang}. Con tus propias palabras, expresa el significado de cada frase.',
        'tr.native_label': '✍️ Mi traducción al {lang}',
        'tr.native_ph': 'Escribe tu traducción aquí…',
        'tr.to_back_btn': '✅ Listo — siguiente: escríbelo de nuevo en chino',
        'tr.step2_title': 'Paso 2: usando solo tu traducción, escríbelo en chino',
        'tr.step2_hint': 'No mires el original. Traduce tu texto en {lang} de vuelta al chino.',
        'tr.peek_orig': '👁 Ver el original (inténtalo tú primero)',
        'tr.back_label': '✍️ Retrotraducción (chino)',
        'tr.back_ph': 'Escribe el chino aquí…',
        'tr.prev_btn': '⬅ Paso anterior',
        'tr.check_btn': '🔍 Comparar con el original',
        'tr.checking': '⏳ La IA compara frase por frase con el original…',
        'tr.check_fail': '⚠️ Falló la comprobación de la IA: revisa tu clave API. Abajo tienes una vista lado a lado.',
        'tr.result_title': '📊 Resultado de la comparación',
        'tr.score_label': 'Correspondencia',
        'tr.native_fidelity': 'Qué tan fiel es tu traducción al original',
        'tr.verdict_match': 'Coincide', 'tr.verdict_partial': 'Parcial', 'tr.verdict_miss': 'Falta', 'tr.verdict_extra': 'Sobra', 'tr.verdict_wrong': 'Mal',
        'tr.th_orig': 'Frase original', 'tr.th_back': 'Tu retrotraducción', 'tr.th_verdict': 'Veredicto', 'tr.th_note': 'Nota de la IA',
        'tr.extra_note': '(Contenido de más en tu retrotraducción, que no está en el original)',
        'tr.again_btn': '🔁 Practicar de nuevo con el mismo texto',
        'tr.new_btn': '📄 Usar otro texto',
        'tr.edit_back_btn': '✍️ Editar la retrotraducción',
        'tr.restart_btn': '🔄 Reiniciar',
        'tr.need_key': '🔑 Introduce primero tu clave API de DeepSeek',
        'tr.empty_source': '⚠️ Pega primero el texto chino',
        'tr.empty_native': '⚠️ Escribe primero tu traducción',
        'tr.empty_back': '⚠️ Escribe primero la retrotraducción al chino',
        'tr.too_long': '⚠️ El texto es muy largo: mantenlo por debajo de unos {n} caracteres antes de comprobar',
        'tr.ai_no_items': 'La IA no devolvió resultados frase por frase; abajo tienes una vista lado a lado.'
    },
    'Russian': {
        'tr.tab': '📖 Перевод',
        'tr.title': '📖 Упражнение на перевод: обратный перевод',
        'tr.desc': 'Вставьте китайский текст для тренировки: ① глядя на оригинал, переведите его на родной язык; ② видя только свой перевод, напишите его снова по-китайски; ③ ИИ сравнит ваш обратный перевод с оригиналом по предложениям.',
        'tr.source_label': '① Введите китайский текст',
        'tr.source_ph': 'Вставьте сюда китайский текст для тренировки (урок, статья, диалог…)',
        'tr.source_meta': '{chars} знаков · около {sents} предложений · ничего не сохраняется; очищается при перезагрузке',
        'tr.sample_btn': '📄 Загрузить пример',
        'tr.start_btn': '🚀 Начать',
        'tr.clear_btn': '🗑 Очистить',
        'tr.step1_title': 'Шаг 1: глядя на оригинал, переведите на родной язык',
        'tr.step1_hint': 'Переведите текст ниже на {lang}. Своими словами передайте смысл каждого предложения.',
        'tr.native_label': '✍️ Мой перевод на {lang}',
        'tr.native_ph': 'Пишите перевод здесь…',
        'tr.to_back_btn': '✅ Готово — дальше: написать снова по-китайски',
        'tr.step2_title': 'Шаг 2: видя только свой перевод, напишите по-китайски',
        'tr.step2_hint': 'Не смотрите в оригинал. Переведите свой текст на {lang} обратно на китайский.',
        'tr.peek_orig': '👁 Подсмотреть оригинал (сначала попробуйте сами)',
        'tr.back_label': '✍️ Обратный перевод (китайский)',
        'tr.back_ph': 'Пишите китайский текст здесь…',
        'tr.prev_btn': '⬅ Предыдущий шаг',
        'tr.check_btn': '🔍 Сравнить с оригиналом',
        'tr.checking': '⏳ ИИ сравнивает с оригиналом по предложениям…',
        'tr.check_fail': '⚠️ Проверка ИИ не удалась — проверьте ключ API. Ниже показано сравнение рядом.',
        'tr.result_title': '📊 Результат сравнения',
        'tr.score_label': 'Соответствие',
        'tr.native_fidelity': 'Насколько точно ваш перевод передаёт оригинал',
        'tr.verdict_match': 'Совпадает', 'tr.verdict_partial': 'Частично', 'tr.verdict_miss': 'Пропущено', 'tr.verdict_extra': 'Лишнее', 'tr.verdict_wrong': 'Неверно',
        'tr.th_orig': 'Предложение оригинала', 'tr.th_back': 'Ваш обратный перевод', 'tr.th_verdict': 'Вердикт', 'tr.th_note': 'Пояснение ИИ',
        'tr.extra_note': '(Лишнее в вашем обратном переводе, чего нет в оригинале)',
        'tr.again_btn': '🔁 Ещё раз с тем же текстом',
        'tr.new_btn': '📄 Взять другой текст',
        'tr.edit_back_btn': '✍️ Исправить обратный перевод',
        'tr.restart_btn': '🔄 Начать заново',
        'tr.need_key': '🔑 Сначала введите ключ API DeepSeek',
        'tr.empty_source': '⚠️ Сначала вставьте китайский текст',
        'tr.empty_native': '⚠️ Сначала напишите перевод',
        'tr.empty_back': '⚠️ Сначала напишите обратный перевод на китайском',
        'tr.too_long': '⚠️ Текст слишком длинный — сократите примерно до {n} знаков перед проверкой',
        'tr.ai_no_items': 'ИИ не вернул результаты по предложениям; ниже сравнение рядом.'
    },
    'Italian': {
        'tr.tab': '📖 Traduzione',
        'tr.title': '📖 Esercizio di traduzione: retro-traduzione',
        'tr.desc': "Incolla un testo cinese da esercitare: ① guardando l'originale, traducilo nella tua lingua; ② usando solo la tua traduzione, riscrivilo in cinese; ③ l'IA confronta la tua retro-traduzione con l'originale frase per frase.",
        'tr.source_label': '① Inserisci il testo cinese',
        'tr.source_ph': 'Incolla qui il testo cinese da esercitare (lezione, articolo, dialogo…)',
        'tr.source_meta': '{chars} caratteri · circa {sents} frasi · non viene salvato nulla; si cancella al ricaricamento',
        'tr.sample_btn': '📄 Carica testo di esempio',
        'tr.start_btn': '🚀 Inizia',
        'tr.clear_btn': '🗑 Pulisci',
        'tr.step1_title': "Passo 1: guardando l'originale, traduci nella tua lingua",
        'tr.step1_hint': 'Traduci il testo qui sotto in {lang}. Con parole tue, esprimi il significato di ogni frase.',
        'tr.native_label': '✍️ La mia traduzione in {lang}',
        'tr.native_ph': 'Scrivi qui la tua traduzione…',
        'tr.to_back_btn': '✅ Fatto — avanti: riscrivi in cinese',
        'tr.step2_title': 'Passo 2: usando solo la tua traduzione, riscrivi in cinese',
        'tr.step2_hint': "Non guardare l'originale. Ritraduci in cinese il tuo testo in {lang}.",
        'tr.peek_orig': "👁 Sbircia l'originale (prova prima da solo)",
        'tr.back_label': '✍️ Retro-traduzione (cinese)',
        'tr.back_ph': 'Scrivi qui il cinese…',
        'tr.prev_btn': '⬅ Passo precedente',
        'tr.check_btn': "🔍 Confronta con l'originale",
        'tr.checking': "⏳ L'IA confronta frase per frase con l'originale…",
        'tr.check_fail': "⚠️ Verifica IA non riuscita — controlla la chiave API. Sotto trovi il confronto affiancato.",
        'tr.result_title': '📊 Risultato del confronto',
        'tr.score_label': 'Corrispondenza',
        'tr.native_fidelity': "Quanto fedelmente la tua traduzione riflette l'originale",
        'tr.verdict_match': 'Uguale', 'tr.verdict_partial': 'Parziale', 'tr.verdict_miss': 'Manca', 'tr.verdict_extra': 'In più', 'tr.verdict_wrong': 'Sbagliato',
        'tr.th_orig': 'Frase originale', 'tr.th_back': 'La tua retro-traduzione', 'tr.th_verdict': 'Giudizio', 'tr.th_note': "Nota dell'IA",
        'tr.extra_note': "(Contenuto in più nella tua retro-traduzione, assente dall'originale)",
        'tr.again_btn': '🔁 Esercitati di nuovo con lo stesso testo',
        'tr.new_btn': '📄 Usa un altro testo',
        'tr.edit_back_btn': '✍️ Modifica la retro-traduzione',
        'tr.restart_btn': '🔄 Ricomincia',
        'tr.need_key': '🔑 Inserisci prima la chiave API DeepSeek',
        'tr.empty_source': '⚠️ Incolla prima il testo cinese',
        'tr.empty_native': '⚠️ Scrivi prima la tua traduzione',
        'tr.empty_back': '⚠️ Scrivi prima la retro-traduzione in cinese',
        'tr.too_long': "⚠️ Testo troppo lungo — tienilo sotto i {n} caratteri circa prima della verifica",
        'tr.ai_no_items': "L'IA non ha restituito risultati frase per frase; sotto trovi il confronto affiancato."
    },
    'Thai': {
        'tr.tab': '📖 ฝึกแปล',
        'tr.title': '📖 ฝึกแปล: แปลกลับ',
        'tr.desc': 'วางข้อความภาษาจีนที่ต้องการฝึก ① แปลเป็นภาษาแม่โดยดูต้นฉบับ ② เห็นเฉพาะคำแปลของตัวเองแล้วเขียนกลับเป็นภาษาจีน ③ AI เปรียบเทียบกับต้นฉบับทีละประโยค',
        'tr.source_label': '① ใส่ข้อความภาษาจีน',
        'tr.source_ph': 'วางข้อความภาษาจีนที่ต้องการฝึกที่นี่（บทเรียน บทความ บทสนทนา）…',
        'tr.source_meta': '{chars} ตัวอักษร · ประมาณ {sents} ประโยค · ไม่บันทึกข้อมูล หายเมื่อรีเฟรชหน้า',
        'tr.sample_btn': '📄 โหลดข้อความตัวอย่าง',
        'tr.start_btn': '🚀 เริ่ม',
        'tr.clear_btn': '🗑 ล้าง',
        'tr.step1_title': 'ขั้นที่ 1: ดูต้นฉบับแล้วแปลเป็นภาษาแม่',
        'tr.step1_hint': 'แปลข้อความด้านล่างเป็น{lang} ใช้สำนวนของตัวเอง พยายามถ่ายทอดความหมายของทุกประโยค',
        'tr.native_label': '✍️ คำแปล{lang}ของฉัน',
        'tr.native_ph': 'เขียนคำแปลที่นี่…',
        'tr.to_back_btn': '✅ แปลเสร็จ · ต่อไป: เขียนกลับเป็นภาษาจีน',
        'tr.step2_title': 'ขั้นที่ 2: เห็นเฉพาะคำแปลของตัวเองแล้วเขียนกลับเป็นภาษาจีน',
        'tr.step2_hint': 'อย่าดูต้นฉบับ แปลข้อความ{lang}ที่เพิ่งเขียนกลับเป็นภาษาจีน',
        'tr.peek_orig': '👁 แอบดูต้นฉบับ（ลองเขียนเองก่อน）',
        'tr.back_label': '✍️ ข้อความที่เขียนกลับเป็นภาษาจีน',
        'tr.back_ph': 'เขียนภาษาจีนที่นี่…',
        'tr.prev_btn': '⬅ ขั้นก่อนหน้า',
        'tr.check_btn': '🔍 เปรียบเทียบกับต้นฉบับ',
        'tr.checking': '⏳ AI กำลังเปรียบเทียบกับต้นฉบับทีละประโยค…',
        'tr.check_fail': '⚠️ การตรวจสอบด้วย AI ล้มเหลว โปรดตรวจ API Key ด้านล่างเป็นการเทียบเคียงกันให้ดูก่อน',
        'tr.result_title': '📊 ผลการเปรียบเทียบ',
        'tr.score_label': 'ความตรงกัน',
        'tr.native_fidelity': 'คำแปลภาษาแม่ตรงกับต้นฉบับเพียงใด',
        'tr.verdict_match': 'ตรงกัน', 'tr.verdict_partial': 'ตรงบางส่วน', 'tr.verdict_miss': 'ขาดหาย', 'tr.verdict_extra': 'เกินมา', 'tr.verdict_wrong': 'ผิด',
        'tr.th_orig': 'ประโยคต้นฉบับ', 'tr.th_back': 'ข้อความที่เขียนกลับ', 'tr.th_verdict': 'คำตัดสิน', 'tr.th_note': 'คำอธิบาย AI',
        'tr.extra_note': '（เนื้อหาที่เกินมาในการเขียนกลับ ไม่มีในต้นฉบับ）',
        'tr.again_btn': '🔁 ฝึกอีกครั้งด้วยข้อความเดิม',
        'tr.new_btn': '📄 เปลี่ยนข้อความใหม่',
        'tr.edit_back_btn': '✍️ แก้ข้อความที่เขียนกลับ',
        'tr.restart_btn': '🔄 เริ่มใหม่',
        'tr.need_key': '🔑 กรุณากรอก DeepSeek API Key ก่อน',
        'tr.empty_source': '⚠️ กรุณาวางข้อความภาษาจีนก่อน',
        'tr.empty_native': '⚠️ กรุณาเขียนคำแปลก่อน',
        'tr.empty_back': '⚠️ กรุณาเขียนข้อความภาษาจีนที่แปลกลับก่อน',
        'tr.too_long': '⚠️ ข้อความยาวเกินไป กรุณาให้ไม่เกินประมาณ {n} ตัวอักษรก่อนตรวจสอบ',
        'tr.ai_no_items': 'AI ไม่ได้ส่งผลลัพธ์รายประโยค ด้านล่างเป็นการเทียบเคียงกัน'
    },
    'Vietnamese': {
        'tr.tab': '📖 Luyện dịch',
        'tr.title': '📖 Luyện dịch: dịch ngược',
        'tr.desc': 'Dán đoạn văn tiếng Trung muốn luyện: ① nhìn bản gốc dịch sang tiếng mẹ đẻ; ② chỉ nhìn bản dịch của mình, viết lại bằng tiếng Trung; ③ AI đối chiếu từng câu với bản gốc.',
        'tr.source_label': '① Nhập đoạn văn tiếng Trung',
        'tr.source_ph': 'Dán đoạn văn tiếng Trung muốn luyện vào đây（bài khóa, bài báo, hội thoại đều được）…',
        'tr.source_meta': '{chars} chữ · khoảng {sents} câu · không lưu, làm mới trang sẽ xóa',
        'tr.sample_btn': '📄 Tải đoạn văn mẫu',
        'tr.start_btn': '🚀 Bắt đầu',
        'tr.clear_btn': '🗑 Xóa',
        'tr.step1_title': 'Bước 1: nhìn bản gốc, dịch sang tiếng mẹ đẻ',
        'tr.step1_hint': 'Dịch đoạn văn dưới đây sang {lang}. Dùng lời của mình, cố gắng diễn đạt ý của từng câu.',
        'tr.native_label': '✍️ Bản dịch {lang} của tôi',
        'tr.native_ph': 'Viết bản dịch ở đây…',
        'tr.to_back_btn': '✅ Dịch xong · tiếp theo: viết lại bằng tiếng Trung',
        'tr.step2_title': 'Bước 2: chỉ nhìn bản dịch của mình, viết lại bằng tiếng Trung',
        'tr.step2_hint': 'Đừng nhìn bản gốc. Dịch đoạn {lang} vừa viết trở lại tiếng Trung.',
        'tr.peek_orig': '👁 Xem lén bản gốc（cố tự viết trước）',
        'tr.back_label': '✍️ Bản dịch ngược（tiếng Trung）',
        'tr.back_ph': 'Viết tiếng Trung ở đây…',
        'tr.prev_btn': '⬅ Bước trước',
        'tr.check_btn': '🔍 Đối chiếu với bản gốc',
        'tr.checking': '⏳ AI đang đối chiếu từng câu với bản gốc…',
        'tr.check_fail': '⚠️ Kiểm tra bằng AI thất bại, hãy kiểm tra API Key. Dưới đây là phần so sánh song song.',
        'tr.result_title': '📊 Kết quả đối chiếu',
        'tr.score_label': 'Mức tương ứng',
        'tr.native_fidelity': 'Bản dịch tiếng mẹ đẻ có trung thành với bản gốc không',
        'tr.verdict_match': 'Khớp', 'tr.verdict_partial': 'Khớp một phần', 'tr.verdict_miss': 'Thiếu', 'tr.verdict_extra': 'Thừa', 'tr.verdict_wrong': 'Sai',
        'tr.th_orig': 'Câu gốc', 'tr.th_back': 'Bản dịch ngược của bạn', 'tr.th_verdict': 'Đánh giá', 'tr.th_note': 'Giải thích của AI',
        'tr.extra_note': '（Nội dung thừa trong bản dịch ngược, không có ở bản gốc）',
        'tr.again_btn': '🔁 Luyện lại với cùng đoạn văn',
        'tr.new_btn': '📄 Đổi đoạn văn khác',
        'tr.edit_back_btn': '✍️ Sửa bản dịch ngược',
        'tr.restart_btn': '🔄 Làm lại từ đầu',
        'tr.need_key': '🔑 Hãy nhập DeepSeek API Key trước',
        'tr.empty_source': '⚠️ Hãy dán đoạn văn tiếng Trung trước',
        'tr.empty_native': '⚠️ Hãy viết bản dịch trước',
        'tr.empty_back': '⚠️ Hãy viết bản dịch ngược tiếng Trung trước',
        'tr.too_long': '⚠️ Đoạn văn quá dài — hãy giữ dưới khoảng {n} chữ trước khi kiểm tra',
        'tr.ai_no_items': 'AI không trả về kết quả từng câu; dưới đây là phần so sánh song song.'
    },
    'Indonesian': {
        'tr.tab': '📖 Latihan Terjemahan',
        'tr.title': '📖 Latihan Terjemahan: Terjemahan Balik',
        'tr.desc': 'Tempel teks bahasa Mandarin untuk dilatih: ① lihat teks asli lalu terjemahkan ke bahasa ibumu; ② hanya melihat terjemahanmu sendiri, tulis kembali dalam bahasa Mandarin; ③ AI membandingkan terjemahan balikmu dengan teks asli kalimat demi kalimat.',
        'tr.source_label': '① Masukkan teks bahasa Mandarin',
        'tr.source_ph': 'Tempel teks bahasa Mandarin yang ingin dilatih di sini（teks pelajaran, artikel, dialog）…',
        'tr.source_meta': '{chars} karakter · sekitar {sents} kalimat · tidak disimpan; hilang saat halaman dimuat ulang',
        'tr.sample_btn': '📄 Muat teks contoh',
        'tr.start_btn': '🚀 Mulai',
        'tr.clear_btn': '🗑 Bersihkan',
        'tr.step1_title': 'Langkah 1: melihat teks asli, terjemahkan ke bahasa ibumu',
        'tr.step1_hint': 'Terjemahkan teks di bawah ini ke {lang}. Gunakan kata-katamu sendiri, usahakan menyampaikan makna setiap kalimat.',
        'tr.native_label': '✍️ Terjemahan {lang} saya',
        'tr.native_ph': 'Tulis terjemahanmu di sini…',
        'tr.to_back_btn': '✅ Selesai · berikutnya: tulis kembali dalam bahasa Mandarin',
        'tr.step2_title': 'Langkah 2: hanya melihat terjemahanmu, tulis kembali dalam bahasa Mandarin',
        'tr.step2_hint': 'Jangan melihat teks asli. Terjemahkan teks {lang} yang baru kamu tulis kembali ke bahasa Mandarin.',
        'tr.peek_orig': '👁 Intip teks asli（coba tulis sendiri dulu）',
        'tr.back_label': '✍️ Terjemahan balik（Mandarin）',
        'tr.back_ph': 'Tulis bahasa Mandarin di sini…',
        'tr.prev_btn': '⬅ Langkah sebelumnya',
        'tr.check_btn': '🔍 Bandingkan dengan teks asli',
        'tr.checking': '⏳ AI sedang membandingkan kalimat demi kalimat dengan teks asli…',
        'tr.check_fail': '⚠️ Pemeriksaan AI gagal — periksa API Key. Di bawah ini tampilan perbandingan berdampingan.',
        'tr.result_title': '📊 Hasil Perbandingan',
        'tr.score_label': 'Kesesuaian',
        'tr.native_fidelity': 'Seberapa setia terjemahan bahasa ibumu terhadap teks asli',
        'tr.verdict_match': 'Sesuai', 'tr.verdict_partial': 'Sebagian', 'tr.verdict_miss': 'Hilang', 'tr.verdict_extra': 'Lebih', 'tr.verdict_wrong': 'Salah',
        'tr.th_orig': 'Kalimat asli', 'tr.th_back': 'Terjemahan balikmu', 'tr.th_verdict': 'Penilaian', 'tr.th_note': 'Catatan AI',
        'tr.extra_note': '（Konten tambahan dalam terjemahan balikmu, tidak ada di teks asli）',
        'tr.again_btn': '🔁 Latihan lagi dengan teks yang sama',
        'tr.new_btn': '📄 Ganti teks lain',
        'tr.edit_back_btn': '✍️ Edit terjemahan balik',
        'tr.restart_btn': '🔄 Mulai ulang',
        'tr.need_key': '🔑 Masukkan DeepSeek API Key terlebih dahulu',
        'tr.empty_source': '⚠️ Tempel teks bahasa Mandarin terlebih dahulu',
        'tr.empty_native': '⚠️ Tulis terjemahanmu terlebih dahulu',
        'tr.empty_back': '⚠️ Tulis terjemahan balik bahasa Mandarin terlebih dahulu',
        'tr.too_long': '⚠️ Teks terlalu panjang — jaga di bawah sekitar {n} karakter sebelum diperiksa',
        'tr.ai_no_items': 'AI tidak mengembalikan hasil per kalimat; di bawah ini perbandingan berdampingan.'
    },
    'Slovak': {
        'tr.tab': '📖 Preklad',
        'tr.title': '📖 Prekladové cvičenie: spätný preklad',
        'tr.desc': 'Vlož čínsky text na precvičenie: ① pri pohľade na originál ho prelož do svojho jazyka; ② iba so svojím prekladom ho napíš späť po čínsky; ③ AI porovná tvoj spätný preklad s originálom vetu po vete.',
        'tr.source_label': '① Zadaj čínsky text',
        'tr.source_ph': 'Vlož sem čínsky text na precvičenie (lekcia, článok, dialóg…)',
        'tr.source_meta': '{chars} znakov · asi {sents} viet · nič sa neukladá; po obnovení stránky sa vymaže',
        'tr.sample_btn': '📄 Načítať ukážkový text',
        'tr.start_btn': '🚀 Začať',
        'tr.clear_btn': '🗑 Vymazať',
        'tr.step1_title': 'Krok 1: pri pohľade na originál prelož do svojho jazyka',
        'tr.step1_hint': 'Prelož text nižšie do {lang}. Vlastnými slovami vyjadri význam každej vety.',
        'tr.native_label': '✍️ Môj preklad do {lang}',
        'tr.native_ph': 'Sem napíš svoj preklad…',
        'tr.to_back_btn': '✅ Hotovo — ďalej: napíš späť po čínsky',
        'tr.step2_title': 'Krok 2: iba so svojím prekladom napíš späť po čínsky',
        'tr.step2_hint': 'Nepozeraj sa na originál. Prelož svoj {lang} text späť do čínštiny.',
        'tr.peek_orig': '👁 Pozrieť originál (najprv to skús sám)',
        'tr.back_label': '✍️ Spätný preklad (čínština)',
        'tr.back_ph': 'Sem napíš čínsky text…',
        'tr.prev_btn': '⬅ Predchádzajúci krok',
        'tr.check_btn': '🔍 Porovnať s originálom',
        'tr.checking': '⏳ AI porovnáva vetu po vete s originálom…',
        'tr.check_fail': '⚠️ Kontrola AI zlyhala — skontroluj API kľúč. Nižšie je porovnanie vedľa seba.',
        'tr.result_title': '📊 Výsledok porovnania',
        'tr.score_label': 'Zhoda',
        'tr.native_fidelity': 'Ako verne tvoj preklad vystihuje originál',
        'tr.verdict_match': 'Zhoda', 'tr.verdict_partial': 'Čiastočne', 'tr.verdict_miss': 'Chýba', 'tr.verdict_extra': 'Navyše', 'tr.verdict_wrong': 'Zle',
        'tr.th_orig': 'Pôvodná veta', 'tr.th_back': 'Tvoj spätný preklad', 'tr.th_verdict': 'Verdikt', 'tr.th_note': 'Poznámka AI',
        'tr.extra_note': '(Obsah navyše v tvojom spätnom preklade, ktorý v origináli nie je)',
        'tr.again_btn': '🔁 Precvičiť znova s tým istým textom',
        'tr.new_btn': '📄 Použiť iný text',
        'tr.edit_back_btn': '✍️ Upraviť spätný preklad',
        'tr.restart_btn': '🔄 Začať odznova',
        'tr.need_key': '🔑 Najprv zadaj DeepSeek API kľúč',
        'tr.empty_source': '⚠️ Najprv vlož čínsky text',
        'tr.empty_native': '⚠️ Najprv napíš svoj preklad',
        'tr.empty_back': '⚠️ Najprv napíš spätný preklad po čínsky',
        'tr.too_long': '⚠️ Text je príliš dlhý — pred kontrolou ho skráť na približne {n} znakov',
        'tr.ai_no_items': 'AI nevrátila výsledky po vetách; nižšie je porovnanie vedľa seba.'
    }
};

(function () {
    'use strict';

    const TR_MAX_CHARS = 3000;
    const TR_SAMPLE = '我叫王小雨，今年十九岁，是一名大学生。我的专业是英语，但是我非常喜欢汉语。每天上午我在教室上课，下午去图书馆学习。周末的时候，我常常和朋友们一起去公园散步，或者去电影院看电影。上个月我参加了学校的汉语比赛，虽然没有得到第一名，但是我认识了很多新朋友。明年暑假我想去中国旅行，亲眼看看长城和故宫。为了实现这个梦想，我每天都要认真练习听说读写。';

    let trInited = false;
    let trState = { phase: 'setup', source: '', native: '', back: '', result: null };

    function trHooks() {
        try { return window.__xhyHooks || null; } catch (e) { return null; }
    }
    function trT(key) {
        const hooks = trHooks();
        if (hooks && typeof hooks.t === 'function') {
            try { return hooks.t(key); } catch (e) {}
        }
        // 兜底：直接按界面语言选择器查本模块词条（不依赖主程序内部函数）
        let lang = 'English';
        try {
            const sel = document.getElementById('targetLanguageSelect');
            if (sel && sel.value) lang = sel.value;
        } catch (e) {}
        const dict = I18N_NEW16[lang] || I18N_NEW16['Chinese'] || {};
        return dict[key] || (I18N_NEW16['Chinese'] && I18N_NEW16['Chinese'][key]) || key;
    }
    function trEsc(s) {
        return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function trToast(msg) {
        const hooks = trHooks();
        if (hooks && typeof hooks.showToast === 'function') {
            try { hooks.showToast(msg); return; } catch (e) {}
        }
        try {
            const el = document.getElementById('toast');
            if (el) {
                el.textContent = msg;
                el.classList.add('show');
                setTimeout(function () { try { el.classList.remove('show'); } catch (e) {} }, 2000);
                return;
            }
        } catch (e) {}
        try { alert(msg); } catch (e) {}
    }
    // API Key 与请求地址：优先复用主程序的逻辑（hook），否则按同源代理 / GitHub Pages 规则自行计算
    function trApiKey() {
        const hooks = trHooks();
        if (hooks && typeof hooks.currentApiKey === 'function') {
            try { return hooks.currentApiKey(); } catch (e) {}
        }
        try {
            const el = document.getElementById('apiKeyInput');
            const k = el ? el.value.trim() : '';
            const isGithubIo = (location.hostname === 'cyb123-gif.github.io' || /\.github\.io$/.test(location.hostname));
            return k || (isGithubIo ? '' : 'server-proxy');
        } catch (e) { return ''; }
    }
    function trApiBase() {
        const hooks = trHooks();
        if (hooks && hooks.apiBase) return hooks.apiBase;
        try {
            const isGithubIo = (location.hostname === 'cyb123-gif.github.io' || /\.github\.io$/.test(location.hostname));
            return isGithubIo ? 'https://api.deepseek.com/v1/chat/completions' : '/v1/chat/completions';
        } catch (e) { return '/v1/chat/completions'; }
    }
    function trParseJson(raw) {
        let c = String(raw == null ? '' : raw).replace(/```json\s*/gi, '').replace(/```/g, '').trim();
        c = c.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
        try { return JSON.parse(c); } catch (e1) {
            const m = c.match(/\{[\s\S]*\}/);
            if (m) {
                let fixed = m[0];
                fixed = fixed.replace(/,\s*([}\]])/g, '$1');
                fixed = fixed.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
                try { return JSON.parse(fixed); } catch (e2) { return {}; }
            }
            return {};
        }
    }
    function trTargetLangName() {
        try {
            const sel = document.getElementById('targetLanguageSelect');
            if (sel) {
                const opt = sel.options && sel.options[sel.selectedIndex];
                if (opt) return String(opt.textContent || opt.text || sel.value).trim();
                if (sel.value) return String(sel.value);
            }
        } catch (e) {}
        return 'English';
    }
    function trCount(text) {
        const s = String(text || '').trim();
        const chars = s.replace(/\s+/g, '').length;
        const sents = s.split(/[。！？!?；;\n]+/).filter(function (x) { return x.trim(); }).length;
        return { chars: chars, sents: sents || 0 };
    }
    function trReadSource() {
        const el = document.getElementById('trSourceInput');
        if (el) trState.source = el.value;
        return trState.source;
    }
    // 重渲染前先把输入框里未保存的内容同步回状态
    function trCapture() {
        const nEl = document.getElementById('trNativeInput');
        if (nEl) trState.native = nEl.value;
        const bEl = document.getElementById('trBackInput');
        if (bEl) trState.back = bEl.value;
    }
    function trRender() {
        trCapture();
        const area = document.getElementById('trExerciseArea');
        if (!area) return;
        if (trState.phase === 'setup') { area.innerHTML = ''; return; }
        let h = '<div class="card learn-card"><div class="tr-exercise">';
        if (trState.phase === 'toNative') {
            const cnt = trCount(trState.source);
            h += '<div class="tr-step-head"><span class="tr-step-badge">1</span>' + trEsc(trT('tr.step1_title')) + '</div>' +
                '<div class="tr-hint">' + trEsc(trT('tr.step1_hint').replace('{lang}', trTargetLangName())) + '</div>' +
                '<div class="tr-original-box">' + trEsc(trState.source) + '</div>' +
                '<div class="tr-meta">' + trEsc(trT('tr.source_meta').replace('{chars}', cnt.chars).replace('{sents}', cnt.sents)) + '</div>' +
                '<div class="tr-label">' + trEsc(trT('tr.native_label').replace('{lang}', trTargetLangName())) + '</div>' +
                '<textarea id="trNativeInput" class="tr-textarea big" placeholder="' + trEsc(trT('tr.native_ph')) + '">' + trEsc(trState.native) + '</textarea>' +
                '<div class="tr-actions">' +
                '<button class="tr-btn green" onclick="window._trToBack()">' + trEsc(trT('tr.to_back_btn')) + '</button>' +
                '<button class="tr-btn" onclick="window._trRestart()">' + trEsc(trT('tr.restart_btn')) + '</button>' +
                '</div>';
        } else if (trState.phase === 'back') {
            h += '<div class="tr-step-head"><span class="tr-step-badge">2</span>' + trEsc(trT('tr.step2_title')) + '</div>' +
                '<div class="tr-hint">' + trEsc(trT('tr.step2_hint').replace('{lang}', trTargetLangName())) + '</div>' +
                '<details class="tr-peek"><summary>' + trEsc(trT('tr.peek_orig')) + '</summary><div class="tr-original-box">' + trEsc(trState.source) + '</div></details>' +
                '<div class="tr-label">' + trEsc(trT('tr.native_label').replace('{lang}', trTargetLangName())) + '</div>' +
                '<div class="tr-native-box">' + trEsc(trState.native) + '</div>' +
                '<div class="tr-label">' + trEsc(trT('tr.back_label')) + '</div>' +
                '<textarea id="trBackInput" class="tr-textarea big" placeholder="' + trEsc(trT('tr.back_ph')) + '">' + trEsc(trState.back) + '</textarea>' +
                '<div class="tr-actions">' +
                '<button class="tr-btn primary" onclick="window._trCheck()">' + trEsc(trT('tr.check_btn')) + '</button>' +
                '<button class="tr-btn" onclick="window._trBackToNative()">' + trEsc(trT('tr.prev_btn')) + '</button>' +
                '<button class="tr-btn" onclick="window._trRestart()">' + trEsc(trT('tr.restart_btn')) + '</button>' +
                '</div>';
        } else if (trState.phase === 'checking') {
            h += '<div class="tr-checking"><span class="tr-spinner"></span>' + trEsc(trT('tr.checking')) + '</div>';
        } else if (trState.phase === 'result') {
            h += trRenderResult();
        }
        h += '</div></div>';
        area.innerHTML = h;
        if (trState.phase === 'toNative') {
            const nEl = document.getElementById('trNativeInput');
            if (nEl) setTimeout(function () { try { nEl.focus(); } catch (e) {} }, 60);
        } else if (trState.phase === 'back') {
            const bEl = document.getElementById('trBackInput');
            if (bEl) setTimeout(function () { try { bEl.focus(); } catch (e) {} }, 60);
        }
    }
    function trVerdictLabel(v) {
        const map = { match: 'tr.verdict_match', partial: 'tr.verdict_partial', miss: 'tr.verdict_miss', extra: 'tr.verdict_extra', wrong: 'tr.verdict_wrong' };
        return map[v] ? trT(map[v]) : String(v || '');
    }
    function trRenderResult() {
        const r = trState.result || {};
        let h = '<div class="tr-step-head"><span class="tr-step-badge">3</span>' + trEsc(trT('tr.result_title')) + '</div>';
        if (r.error) {
            h += '<div class="tr-note-box">' + trEsc(trT('tr.check_fail')) + '</div>' + trSideBySide(trState.source, trState.back);
            h += trResultActions();
            return h;
        }
        const overall = r.overall || {};
        const nf = r.nativeFidelity || {};
        const items = Array.isArray(r.items) ? r.items : [];
        let score = parseInt(overall.score, 10);
        if (!(score >= 0)) score = 0;
        if (score > 100) score = 100;
        const cls = score >= 85 ? 'good' : (score >= 60 ? 'mid' : 'bad');
        h += '<div class="tr-score-wrap"><div class="tr-score ' + cls + '">' + score + '</div><div><div class="tr-score-label">' + trEsc(trT('tr.score_label')) + '</div><div class="tr-overall-note">' + trEsc(overall.note || '') + '</div></div></div>';
        // 母语翻译忠实度
        const nfIcon = nf.ok === true ? '✅' : (nf.ok === false ? '⚠️' : '💬');
        h += '<div class="tr-note-box">' + nfIcon + ' <b>' + trEsc(trT('tr.native_fidelity')) + '</b>' + (nf.note ? '：' + trEsc(nf.note) : '') + '</div>';
        if (items.length) {
            const counts = { match: 0, partial: 0, miss: 0, extra: 0, wrong: 0 };
            items.forEach(function (it) { const v = it && it.verdict; if (counts[v] !== undefined) counts[v]++; });
            h += '<div class="tr-chip-row">';
            Object.keys(counts).forEach(function (v) {
                if (counts[v] > 0) h += '<span class="tr-chip ' + v + '">' + trEsc(trVerdictLabel(v)) + ' ' + counts[v] + '</span>';
            });
            h += '</div>';
            h += '<table class="tr-table"><thead><tr><th style="width:30%;">' + trEsc(trT('tr.th_orig')) + '</th><th style="width:30%;">' + trEsc(trT('tr.th_back')) + '</th><th style="width:12%;">' + trEsc(trT('tr.th_verdict')) + '</th><th>' + trEsc(trT('tr.th_note')) + '</th></tr></thead><tbody>';
            items.forEach(function (it) {
                const v = it && it.verdict ? String(it.verdict) : 'match';
                const origTxt = (it && it.orig) ? String(it.orig) : trT('tr.extra_note');
                const backTxt = (it && it.back) ? String(it.back) : '—';
                h += '<tr><td class="orig">' + trEsc(origTxt) + '</td><td class="back">' + trEsc(backTxt) + '</td><td><span class="tr-verdict ' + trEsc(v) + '">' + trEsc(trVerdictLabel(v)) + '</span></td><td class="tr-note">' + trEsc((it && it.note) || '') + '</td></tr>';
            });
            h += '</tbody></table>';
        } else {
            h += '<div class="tr-note-box">' + trEsc(trT('tr.ai_no_items')) + '</div>' + trSideBySide(trState.source, trState.back);
        }
        h += trResultActions();
        return h;
    }
    function trResultActions() {
        return '<div class="tr-actions">' +
            '<button class="tr-btn green" onclick="window._trAgain()">' + trEsc(trT('tr.again_btn')) + '</button>' +
            '<button class="tr-btn" onclick="window._trEditBack()">' + trEsc(trT('tr.edit_back_btn')) + '</button>' +
            '<button class="tr-btn" onclick="window._trNew()">' + trEsc(trT('tr.new_btn')) + '</button>' +
            '</div>';
    }
    // AI 对照失败时的并排对比（有主程序 hook 时复用它的 diffHighlightHtml 高亮）
    function trSideBySide(orig, back) {
        let o = String(orig || ''), b = String(back || '');
        const hooks = trHooks();
        try {
            if (hooks && typeof hooks.diffHighlightHtml === 'function') {
                const d = hooks.diffHighlightHtml(o, b);
                if (d && (d.origHtml || d.corrHtml)) { o = d.origHtml || o; b = d.corrHtml || b; }
            }
        } catch (e) {}
        return '<div class="tr-sidebyside">' +
            '<div><div class="tr-side-title">📖 ' + trEsc(trT('tr.th_orig')) + '</div><div class="tr-side-box orig">' + o + '</div></div>' +
            '<div><div class="tr-side-title">✍️ ' + trEsc(trT('tr.th_back')) + '</div><div class="tr-side-box back">' + b + '</div></div>' +
            '</div>';
    }
    async function trRunCheck() {
        const apiKey = trApiKey();
        if (!apiKey) return { error: true };
        const langName = trTargetLangName();
        const prompt = '你是HSK中文教师。学生做了一次「翻译回译」练习：①对照中文原文，把课文翻译成自己的母语；②不看原文，把自己的母语翻译回中文。请严格以「原文」为基准做两件事：\n\n' +
            '一、检查学生回译的中文与原文是否对应：以原文的每个句子为基准逐句判定。判定标准：\n' +
            '- match：意思一致（用词、语序不同没关系，信息完整且没有误解）\n' +
            '- partial：大体对应但有遗漏或偏差\n' +
            '- wrong：意思译错\n' +
            '- miss：原文该句的意思在回译里完全没有\n' +
            '- extra：回译里多出原文没有的内容（此时 orig 留空字符串，back 填多出的句子）\n\n' +
            '二、检查学生的母语翻译是否忠实于原文（nativeFidelity.ok = true/false，note 用一句话说明）。\n\n' +
            '【原文】\n' + trState.source + '\n\n' +
            '【学生的母语翻译】\n' + trState.native + '\n\n' +
            '【学生回译的中文】\n' + trState.back + '\n\n' +
            '要求：\n' +
            '1. 先按原文句子顺序输出 items，最后输出 extra 项（如果有）。\n' +
            '2. 每个 item 的 note 用' + langName + '写，≤25词，说明具体差异；没有差异就写一句简短肯定。\n' +
            '3. 每个 item 增加 errWords 数组：该句里学生译错、漏译、多出来的关键中文词（从该句对应的原文或回译中取原样词语，最多4个；match 时为空数组）。\n' +
            '4. overall.score 为 0-100 总分；overall.note 用' + langName + '写一句总评（≤30词）。\n' +
            '5. nativeFidelity.note 用' + langName + '写。\n\n' +
            '输出JSON：{"overall":{"score":数字,"note":"..."},"nativeFidelity":{"ok":true或false,"note":"..."},"items":[{"orig":"原文句子","back":"对应的回译句子（没有就空字符串）","verdict":"match|partial|wrong|miss|extra","note":"说明","errWords":["译错/漏译的关键词"]}]}\n只输出 JSON。';
        try {
            const resp = await fetch(trApiBase(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
                body: JSON.stringify({
                    model: 'deepseek-v4-flash',
                    thinking: { type: 'disabled' },
                    max_tokens: 4096,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0,
                    response_format: { type: 'json_object' }
                })
            });
            const data = await resp.json();
            if (data.error) return { error: true };
            if (!data.choices || !data.choices[0] || !data.choices[0].message) return { error: true };
            let c = String(data.choices[0].message.content || '');
            c = c.replace(/```json/gi, '').replace(/```/g, '').trim();
            const r = trParseJson(c);
            return (r && typeof r === 'object') ? r : { error: true };
        } catch (e) {
            return { error: true };
        }
    }

    // ===== 对外动作（按钮 onclick 调用） =====
    window._trStart = function () {
        const src = trReadSource().trim();
        if (!src) { trToast(trT('tr.empty_source')); return; }
        if (trCount(src).chars > TR_MAX_CHARS) { trToast(trT('tr.too_long').replace('{n}', TR_MAX_CHARS)); return; }
        trState.source = src;
        trState.native = '';
        trState.back = '';
        trState.result = null;
        trState.phase = 'toNative';
        trRender();
        try {
            const area = document.getElementById('trExerciseArea');
            if (area && area.scrollIntoView) area.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch (e) {}
    };
    window._trToBack = function () {
        trCapture();
        const nat = String(trState.native || '').trim();
        if (!nat) { trToast(trT('tr.empty_native')); return; }
        if (trCount(nat).chars > TR_MAX_CHARS) { trToast(trT('tr.too_long').replace('{n}', TR_MAX_CHARS)); return; }
        trState.native = nat;
        trState.phase = 'back';
        trRender();
    };
    window._trBackToNative = function () {
        trState.phase = 'toNative';
        trRender();
    };
    function trRecordErrors(r){
        if(!r || r.error || !Array.isArray(r.items)) return;
        const hooks = trHooks();
        if(hooks && typeof hooks.recordTranslationErrors === 'function'){
            try{ hooks.recordTranslationErrors(r.items); }catch(e){}
        }
    }
    window._trCheck = function () {
        trCapture();
        const back = String(trState.back || '').trim();
        if (!back) { trToast(trT('tr.empty_back')); return; }
        if (trCount(back).chars > TR_MAX_CHARS) { trToast(trT('tr.too_long').replace('{n}', TR_MAX_CHARS)); return; }
        trState.back = back;
        trState.phase = 'checking';
        trRender();
        (async function () {
            const r = await trRunCheck();
            trState.result = r;
            trState.phase = 'result';
            trRender();
            // 译错/漏译/多译的词进「翻译错题练习」
            trRecordErrors(r);
        })();
    };
    window._trRestart = function () {
        trState.native = '';
        trState.back = '';
        trState.result = null;
        trState.phase = 'toNative';
        trRender();
    };
    window._trAgain = function () {
        window._trRestart();
    };
    window._trEditBack = function () {
        trState.phase = 'back';
        trRender();
    };
    window._trNew = function () {
        trState = { phase: 'setup', source: '', native: '', back: '', result: null };
        const el = document.getElementById('trSourceInput');
        if (el) el.value = '';
        trUpdateSourceMeta();
        trRender();
        try {
            const el2 = document.getElementById('trSourceInput');
            if (el2 && el2.scrollIntoView) el2.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            if (el2 && el2.focus) el2.focus();
        } catch (e) {}
    };
    window._trSample = function () {
        const el = document.getElementById('trSourceInput');
        if (el) { el.value = TR_SAMPLE; trUpdateSourceMeta(); }
    };
    window._trClear = function () {
        const el = document.getElementById('trSourceInput');
        if (el) { el.value = ''; trUpdateSourceMeta(); }
    };

    function trUpdateSourceMeta() {
        const el = document.getElementById('trSourceInput');
        const meta = document.getElementById('trSourceMeta');
        if (!meta) return;
        const cnt = trCount(el ? el.value : trState.source);
        meta.textContent = trT('tr.source_meta').replace('{chars}', cnt.chars).replace('{sents}', cnt.sents);
    }

    // ===== 与主程序集成 =====
    function trInit() {
        if (trInited) return;
        trInited = true;
        const area = document.getElementById('translateScrollArea');
        if (!area) { trInited = false; return; }
        area.innerHTML =
            '<div class="card learn-card">' +
            '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;border-radius:24px 24px 0 0;margin:-22px -20px 0;padding:12px 20px 8px;">' +
            '<span id="trTitleLabel" style="font-size:0.82rem;color:#475569;font-weight:600;white-space:nowrap;">📖 翻译练习：课文回译</span>' +
            '</div>' +
            '<div id="trDesc" class="tr-setup-desc">' + trEsc(trT('tr.desc')) + '</div>' +
            '<div class="tr-label" id="trSourceLabel">' + trEsc(trT('tr.source_label')) + '</div>' +
            '<textarea id="trSourceInput" class="tr-textarea big" placeholder="' + trEsc(trT('tr.source_ph')) + '"></textarea>' +
            '<div class="tr-meta" id="trSourceMeta"></div>' +
            '<div class="tr-actions">' +
            '<button class="tr-btn primary" onclick="window._trStart()">' + trEsc(trT('tr.start_btn')) + '</button>' +
            '<button class="tr-btn" onclick="window._trSample()">' + trEsc(trT('tr.sample_btn')) + '</button>' +
            '<button class="tr-btn" onclick="window._trClear()">' + trEsc(trT('tr.clear_btn')) + '</button>' +
            '</div>' +
            '</div>' +
            '<div id="trExerciseArea" style="margin-top:14px;"></div>';
        const srcEl = document.getElementById('trSourceInput');
        if (srcEl) srcEl.addEventListener('input', trUpdateSourceMeta);
        trUpdateSourceMeta();
        trRender();
        trApplyLanguage();
    }
    function trApplyLanguage() {
        try {
            const tab = document.getElementById('modeTabTranslate');
            if (tab) tab.textContent = trT('tr.tab');
            const mainTab = document.getElementById('translateMainTabBtn');
            if (mainTab) mainTab.textContent = trT('tr.tab');
        } catch (e) {}
        if (!trInited) return;
        const tl = document.getElementById('trTitleLabel'); if (tl) tl.textContent = trT('tr.title');
        const d = document.getElementById('trDesc'); if (d) d.textContent = trT('tr.desc');
        const sl = document.getElementById('trSourceLabel'); if (sl) sl.textContent = trT('tr.source_label');
        const ph = document.getElementById('trSourceInput'); if (ph) ph.placeholder = trT('tr.source_ph');
        const sb = document.getElementById('trSampleBtn'); if (sb) sb.textContent = trT('tr.sample_btn');
        const st = document.getElementById('trStartBtn'); if (st) st.textContent = trT('tr.start_btn');
        trUpdateSourceMeta();
        trRender();
    }
    function trOnShow() {
        if (!trInited) return;
        trRender();
    }
    function trReset() {
        trState = { phase: 'setup', source: '', native: '', back: '', result: null };
        const el = document.getElementById('trSourceInput');
        if (el) el.value = '';
        if (trInited) { trUpdateSourceMeta(); trRender(); }
    }

    window.trInit = trInit;
    window.trApplyLanguage = trApplyLanguage;
    window.trOnShow = trOnShow;
    window.trReset = trReset;
})();
