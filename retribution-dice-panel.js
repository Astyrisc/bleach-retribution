/* BLEACH // RETRIBUTION â€” NATIVE PRE-ROLL PROTOTYPE
 * October 2, 2026. Full replies in test topic 2227 only.
 * Native Forumotion rolls; no client-generated dice and no GM credentials.
 * Records remain editable by administrators. Local locks are convenience only.
 */
(function () {
    'use strict';
    if (window.top !== window.self || document.getElementById('br-dice-panel')) return;
    var CONFIG = { topic: '2227', gmUser: '332', timeout: 45000 };
    var form = document.querySelector('form[name="post"]');
    if (!form || document.querySelector('.br-pm-compose-marker')) return;
    var query = new URLSearchParams(location.search);
    var topic = form.elements.namedItem('t');
    var mode = form.elements.namedItem('mode');
    if (String(topic ? topic.value : query.get('t')) !== CONFIG.topic ||
        String(mode ? mode.value : query.get('mode')) !== 'reply') return;
    var nativeDice = form.querySelector('select[name="post_dice_0"]');
    if (!nativeDice) return;
    var user = window._userdata && window._userdata.user_id;
    if (!user || Number(user) < 1) return;
    var key = 'br-dice-test-v1:' + user + ':' + CONFIG.topic;
    var record = null, ready = false, busy = false, timer = null, checking = false, frame;
    var panel = document.createElement('section');
    panel.id = 'br-dice-panel';
    panel.className = 'br-dice-panel';
    panel.setAttribute('aria-labelledby', 'br-dice-title');
    panel.innerHTML = '<h2 id="br-dice-title">01 // ACTION RESOLUTION â€” TEST</h2>' +
        '<p>Your roll declaration will be posted in Dice Rolls Test before your roleplay reply. ' +
        'The result is a native Forumotion roll; staff can still edit its record.</p>' +
        '<div class="br-dice-fields">' +
        '<label>Action<select id="br-dice-kind"><option>Defense</option><option>Attack</option><option>Other check</option></select></label>' +
        '<label>Technique<input id="br-dice-technique" type="text" maxlength="100" placeholder="Shunpo / Cero / sword strike" /></label>' +
        '<label>Stat<select id="br-dice-stat"><option>Mobility</option><option>Offense</option><option>Defense</option><option>Spiritual Arts</option><option>Intellect</option><option>Physical Conditioning</option></select></label>' +
        '<label>Declared modifier<input id="br-dice-mod" type="number" min="0" max="20" step="1" value="0" /></label>' +
        '<label>Opposing post URL<input id="br-dice-target" type="url" placeholder="Paste the attack post link" /></label>' +
        '<label>Opposing total (optional)<input id="br-dice-opposing" type="number" min="1" max="100" step="1" /></label>' +
        '<label>Native die<select id="br-dice-die"></select></label></div>' +
        '<p class="br-dice-note">Modifiers and opposing totals are declared by the player, not verified against a character sheet. Ties favor the defender. No damage is calculated here.</p>' +
        '<div class="br-dice-buttons"><button type="button" id="br-dice-roll" disabled>Post declaration &amp; roll</button>' +
        '<button type="button" id="br-dice-check" disabled>Check recorded result</button>' +
        '<button type="button" id="br-dice-insert" disabled>Attach result to draft</button></div>' +
        '<p id="br-dice-status" role="status" aria-live="polite">Loading the native reply formâ€¦</p>' +
        '<div id="br-dice-result"></div>';
    var posting = document.getElementById('postingbox');
    if (!posting) return;
    posting.parentNode.insertBefore(panel, posting);
    function el(id) { return document.getElementById('br-dice-' + id); }
    function status(message) { el('status').textContent = message; }
    function loadRecord() {
        try { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }
        catch (error) { return null; }
    }
    function persist(next) {
        try { localStorage.setItem(key, JSON.stringify(next)); }
        catch (error) { throw new Error('Browser storage is unavailable. No roll was submitted.'); }
    }
    function controls() {
        el('roll').disabled = !ready || busy || Boolean(record);
        el('check').disabled = !record || busy;
        el('insert').disabled = !record || record.state !== 'resolved' || busy;
        panel.querySelectorAll('.br-dice-fields input,.br-dice-fields select').forEach(function (input) {
            input.disabled = Boolean(record) || busy;
        });
    }
    function urlForPost(id) { return location.origin + '/t' + CONFIG.topic + '-dice-rolls-test#' + id.replace(/^p/, ''); }
    function addText(node, tag, text) { var item = document.createElement(tag); item.textContent = text; node.appendChild(item); return item; }
    function render() {
        var box = el('result'); box.replaceChildren();
        if (!record) return;
        addText(box, 'p', record.kind + ' // ' + record.technique + ' â€” ' + record.stat + ' +' + record.modifier);
        addText(box, 'p', 'Reference: ' + record.id);
        if (record.state === 'resolved') {
            addText(box, 'strong', 'D20 ' + record.face + ' + ' + record.modifier + ' = ' + record.total);
            if (record.opposing !== null && record.kind !== 'Other check') {
                var success = record.kind === 'Defense' ? record.total >= record.opposing : record.total > record.opposing;
                addText(box, 'p', 'Against ' + record.opposing + ': ' + (success ? 'successful check' : 'failed check') + ' (under the declared totals).');
            }
            var link = addText(box, 'a', 'Open native GM result'); link.href = record.resultUrl; link.target = '_blank'; link.rel = 'noopener';
        }
        if (record.target) { var target = addText(box, 'a', 'Open opposing action'); target.href = record.target; target.target = '_blank'; target.rel = 'noopener'; }
        controls();
    }
    function uuid() {
        var bytes = new Uint8Array(12); crypto.getRandomValues(bytes);
        return 'BRD-' + Array.from(bytes, function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    }
    function declaration(r) {
        return '[b]ROLL DECLARATION // ' + r.id + '[/b]\n' +
            'Action: ' + r.kind + '\nTechnique: ' + r.technique + '\nStat: ' + r.stat + '\nDeclared modifier: +' + r.modifier +
            '\nNative die: ' + r.dieName + ' â€” one roll\n' +
            'Opposing action: ' + (r.target || 'None specified') + '\n' +
            'Opposing total: ' + (r.opposing === null ? 'Not specified' : r.opposing) + '\n' +
            'Roll purpose is committed before the result. Do not reroll this action without an explicit recorded ruling.';
    }
    function freshForm() {
        var doc = frame.contentDocument;
        return doc && doc.querySelector('form[name="post"]');
    }
    frame = document.createElement('iframe');
    frame.hidden = true; frame.title = 'Native dice test submission';
    // Intentionally same-origin: the user's own native form supplies fresh hidden fields.
    // No hidden auth values are copied into files or console output.
    frame.src = '/post?t=' + CONFIG.topic + '&mode=reply';
    frame.addEventListener('load', function () {
        if (record) { if (busy) checkResult(); return; }
        var inner = freshForm();
        var dice = inner && inner.querySelector('select[name="post_dice_0"]');
        var send = inner && inner.querySelector('input[type="submit"][name="post"]');
        if (!dice || !send || send.disabled) {
            ready = false; status('The native reply form is unavailable. Check login and reply permissions; no roll has been submitted.'); controls(); return;
        }
        el('die').replaceChildren();
        Array.from(dice.options).filter(function (o) { return o.value && /d\s*20\b/i.test(o.textContent); }).forEach(function (o) {
            var copy = document.createElement('option'); copy.value = o.value; copy.textContent = o.textContent; el('die').appendChild(copy);
        });
        ready = Boolean(el('die').options.length);
        status(ready ? 'Ready. This button publishes a declaration and one native D20 roll in the test thread.' : 'No D20 die was found. No roll has been submitted.');
        controls();
    });
    panel.appendChild(frame);
    record = loadRecord();
    if (record) { render(); status('An existing test roll was restored. Check its recorded result; this panel will not submit another roll.'); }
    function parseResult(doc) {
        var posts = Array.from(doc.querySelectorAll('.post[id^="p"]'));
        var index = posts.findIndex(function (post) {
            var body = post.querySelector('.br-post-content,.postbody .content');
            return body && body.textContent.includes(record.id);
        });
        if (index < 0) return null;
        var declarationPost = posts[index];
        var owner = declarationPost.querySelector('.postprofile-avatar[data-id]');
        if (!owner || owner.getAttribute('data-id') !== String(user)) return null;
        // Require the immediately following post to belong to the configured GM.
        var gm = posts[index + 1];
        if (!gm) return null;
        var avatar = gm.querySelector('.postprofile-avatar[data-id]');
        var gmLink = gm.querySelector('.postprofile a[href^="/u' + CONFIG.gmUser + '"]');
        if (!(avatar && avatar.getAttribute('data-id') === CONFIG.gmUser) && !gmLink) return null;
        var body = gm.querySelector('.br-post-content,.postbody .content');
        if (!body || !body.textContent.includes(record.dieName)) return null;
        var faces = Array.from(body.querySelectorAll('img')).map(function (img) {
            var url = new URL(img.getAttribute('src'), location.origin);
            if (url.hostname !== 'astyrisc.github.io' || !url.pathname.startsWith('/bleach-retribution/')) return null;
            var m = url.pathname.match(/\/(\d{2})-dice\.png$/i);
            return m && Number(m[1]) >= 1 && Number(m[1]) <= 20 ? Number(m[1]) : null;
        }).filter(function (n) { return n !== null; });
        if (faces.length !== 1) return null;
        return { face: faces[0], resultUrl: urlForPost(gm.id), declarationUrl: urlForPost(declarationPost.id) };
    }
    async function checkResult() {
        if (!record || checking) return;
        checking = true;
        clearTimeout(timer);
        // Read real pagination links; no automatic re-submission on any failure.
        try {
            async function readPage(path) {
                var controller = new AbortController();
                var abort = setTimeout(function () { controller.abort(); }, 12000);
                try {
                    var response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', signal: controller.signal });
                    if (!response.ok) throw new Error('Result page could not be loaded.');
                    return new DOMParser().parseFromString(await response.text(), 'text/html');
                } finally { clearTimeout(abort); }
            }
            function pageLinks(doc) {
                return Array.from(doc.querySelectorAll('a[href]')).map(function (a) {
                    var url = new URL(a.getAttribute('href'), location.origin);
                    var m = url.pathname.match(/^\/t2227p(\d+)(?:-|$)/);
                    return url.origin === location.origin && m ? { offset: Number(m[1]), path: url.pathname } : null;
                }).filter(Boolean).sort(function (a, b) { return a.offset - b.offset; });
            }
            var doc = await readPage('/t' + CONFIG.topic + '-dice-rolls-test');
            var result = parseResult(doc);
            if (!result) {
                var links = pageLinks(doc);
                var last = links[links.length - 1];
                if (last) {
                    var lastDoc = await readPage(last.path);
                    result = parseResult(lastDoc);
                    if (!result) {
                        // Handle a declaration at the previous page's bottom and GM at the next page's top.
                        var previous = pageLinks(lastDoc).filter(function (p) { return p.offset < last.offset; }).pop();
                        var previousDoc = previous ? await readPage(previous.path) : doc;
                        var combined = document.implementation.createHTMLDocument('Recorded rolls');
                        var seen = new Set();
                        [previousDoc, lastDoc].forEach(function (d) {
                            d.querySelectorAll('.post[id^="p"]').forEach(function (post) {
                                if (!seen.has(post.id)) { combined.body.appendChild(combined.importNode(post, true)); seen.add(post.id); }
                            });
                        });
                        result = parseResult(combined);
                    }
                }
            }
            if (result) {
                if (record.state === 'resolved' && record.face !== result.face) {
                    busy = false; controls(); status('The displayed GM record has changed since this panel first read it. Keep the links and ask staff to investigate.'); return;
                }
                record.state = 'resolved'; record.face = result.face; record.total = result.face + record.modifier;
                record.resultUrl = result.resultUrl; record.declarationUrl = result.declarationUrl;
                persist(record); busy = false; render(); status('Native result found. Write your roleplay response, then attach this reference.'); return;
            }
            // A native submission may show a confirmation/meta-refresh page first.
            if (busy && Date.now() - record.created < CONFIG.timeout) {
                timer = setTimeout(checkResult, 1800); return;
            }
            busy = false; controls();
            status('No uniquely matching GM result was found. Open the test thread and check the declaration. Do not reroll; use Check recorded result after confirming it exists.');
        } catch (error) {
            busy = false; controls(); status('Could not verify the result. No retry roll was submitted. Check the test thread, then use Check recorded result.');
        } finally { checking = false; }
    }
    el('roll').addEventListener('click', function () {
        if (busy || record || loadRecord()) { record = record || loadRecord(); render(); return; }
        var inner = freshForm();
        if (!ready || !inner) return;
        var technique = el('technique').value.trim();
        var modifier = Number(el('mod').value);
        var opposing = el('opposing').value.trim();
        var target = el('target').value.trim();
        if (!technique || /[\[\]\r\n]/.test(technique)) { status('Enter a technique name without BBCode or line breaks.'); return; }
        if (el('mod').value === '' || !Number.isInteger(modifier) || modifier < 0 || modifier > 20) { status('Enter an integer modifier from 0 to 20.'); return; }
        if (opposing && (!Number.isInteger(Number(opposing)) || Number(opposing) < 1 || Number(opposing) > 100)) { status('Enter an opposing total from 1 to 100, or leave it blank.'); return; }
        if (target) {
            try { var u = new URL(target); if (u.origin !== location.origin || !/^\/t\d+/.test(u.pathname)) throw new Error(); target = u.href; }
            catch (error) { status('Use a topic/post URL from this forum for the opposing action.'); return; }
        }
        if (el('kind').value === 'Defense' && !target) { status('A defense needs a link to the incoming attack.'); return; }
        var dice = inner.querySelector('select[name="post_dice_0"]');
        var rolls = inner.querySelector('input[name="nb_rolls_0"]');
        var textarea = inner.querySelector('textarea[name="message"]');
        var send = inner.querySelector('input[type="submit"][name="post"]');
        if (!dice || !rolls || !textarea || !send || typeof inner.requestSubmit !== 'function') { status('Required native controls are unavailable; no roll was submitted.'); return; }
        var next = { id: uuid(), state: 'pending', created: Date.now(), kind: el('kind').value,
            technique: technique, stat: el('stat').value, modifier: modifier, target: target,
            opposing: opposing ? Number(opposing) : null, dieName: el('die').selectedOptions[0].textContent.trim() };
        try {
            var message = declaration(next);
            var jq = frame.contentWindow.jQuery;
            var editor = jq && jq.fn.sceditor && jq(textarea).sceditor('instance');
            if (editor) { editor.val(message); editor.updateOriginal(); } else { textarea.value = message; }
            inner.querySelectorAll('select[name^="post_dice_"]').forEach(function (select) { select.value = ''; });
            dice.value = el('die').value; rolls.value = '1';
            if (dice.value !== el('die').value) throw new Error('Selected die is unavailable.');
            // Refuse an unrecorded submission if storage cannot hold the pending declaration.
            persist(next); record = next; busy = true; controls(); render();
            status('Submitting your declaration and native roll. Your main roleplay draft has not been submitted.');
            inner.requestSubmit(send);
            timer = setTimeout(checkResult, 2500);
        } catch (error) {
            busy = false; controls(); status(record ? 'Submission status is uncertain. Check the thread before doing anything else; do not reroll.' : error.message);
        }
    });
    el('check').addEventListener('click', function () { busy = true; controls(); checkResult(); });
    el('insert').addEventListener('click', function () {
        if (!record || record.state !== 'resolved') return;
        var textarea = form.querySelector('textarea[name="message"]');
        var jq = window.jQuery;
        var editor = jq && jq.fn.sceditor && jq(textarea).sceditor('instance');
        var text = editor ? editor.val() : textarea.value;
        if (text.includes(record.id)) { status('This result reference is already in your draft.'); return; }
        var receipt = '\n\n[b]ROLL REFERENCE // ' + record.id + '[/b]\n' + record.kind + ': ' + record.technique +
            '\nD20 ' + record.face + ' + ' + record.stat + ' ' + record.modifier + ' = ' + record.total +
            '\n[url=' + record.declarationUrl + ']Committed declaration[/url] | [url=' + record.resultUrl + ']Native GM result[/url]';
        if (editor) { editor.val(text + receipt); editor.updateOriginal(); } else { textarea.value = text + receipt; }
        status('Reference attached. Keep the native dice selector empty when sending this roleplay reply to avoid rolling again.');
    });
    window.addEventListener('storage', function (event) { if (event.key === key) { record = loadRecord(); render(); controls(); } });
    controls();
})();
