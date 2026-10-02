/* BLEACH // RETRIBUTION // NATIVE PRE-ROLL PROTOTYPE
 * October 2, 2026. Test topic 2227: native pre-roll, repeat actions, linked defenses.
 * Defend reads the saved declaration and native GM result; stats remain declared.
 * Native Forumotion rolls; no client-generated dice and no GM credentials.
 * Records remain editable by administrators. Local locks are convenience only.
 */
(function () {
    'use strict';
    if (window.top !== window.self || document.getElementById('br-dice-panel')) return;
    var CONFIG = { topic: '2227', gmUser: '332', timeout: 45000 };
    function declarationText(source) {
        var copy = source.cloneNode(true);
        copy.querySelectorAll('.br-dice-gm-card').forEach(function (n) { n.remove(); });
        copy.querySelectorAll('br').forEach(function (n) { n.replaceWith('\n'); });
        return copy.textContent;
    }
    function recordedAttack(request, gm) {
        if (!request || !gm) return null;
        var source = request.querySelector('.br-post-content,.postbody .content');
        var body = gm.querySelector('.br-post-content,.postbody .content');
        var author = request.querySelector('.postprofile-name');
        var gmAvatar = gm.querySelector('.postprofile-avatar[data-id]');
        var owner = request.querySelector('.postprofile-avatar[data-id]');
        if (!source || !body || !author || !owner || !gmAvatar || gmAvatar.dataset.id !== CONFIG.gmUser) return null;
        var text = declarationText(source);
        var id = text.match(/^\s*ROLL DECLARATION \/\/ (BRD-[a-f0-9]{24})(?:\s|$)/);
        function field(label) {
            var line = text.split(/\r?\n/).find(function (s) { return s.startsWith(label + ': '); });
            return line ? line.slice(label.length + 2).trim() : '';
        }
        if (!id || field('Action') !== 'Attack') return null;
        var modifier = field('Declared modifier');
        var technique = field('Technique');
        var die = field('Native die').split(/ \/\/ | \u2014 | \u00e2/)[0];
        if (!/^\+\d+$/.test(modifier) || Number(modifier) > 20 || !technique || !/d\s*20\b/i.test(die)) return null;
        var native = body.cloneNode(true);
        native.querySelectorAll('.br-dice-gm-card').forEach(function (n) { n.remove(); });
        var member = native.querySelector('strong,b');
        if (!member || member.textContent.trim() !== author.textContent.trim() || !native.textContent.includes(die)) return null;
        var faces = Array.from(native.querySelectorAll('img[src]')).map(function (img) {
            try { var url = new URL(img.getAttribute('src'), location.origin);
                var m = url.pathname.match(/^\/bleach-retribution\/(0[1-9]|1\d|20)-dice\.png$/);
                return url.hostname === 'astyrisc.github.io' && m ? Number(m[1]) : null;
            } catch (error) { return null; }
        }).filter(function (v) { return v !== null; });
        if (faces.length !== 1) return null;
        return { id: id[1], gmPost: gm.id, requester: author.textContent.trim(), user: owner.dataset.id,
            technique: technique, modifier: Number(modifier), face: faces[0], total: faces[0] + Number(modifier),
            resultUrl: location.origin + '/t2227-dice-rolls-test#' + gm.id.replace(/^p/, '') };
    }
    async function readAttack(gmPost, actionId) {
        // The URL carries identifiers only. Read the real declaration and GM face again.
        var queue = ['/t2227-dice-rolls-test'], seenPages = new Set(), postsById = new Map();
        for (var count = 0; queue.length && count < 25; count++) {
            var path = queue.shift(); if (seenPages.has(path)) { count--; continue; }
            seenPages.add(path);
            var controller = new AbortController();
            var timer = setTimeout(function () { controller.abort(); }, 12000);
            var doc;
            try {
                var response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', signal: controller.signal });
                if (!response.ok) throw new Error('The attack record could not be loaded.');
                doc = new DOMParser().parseFromString(await response.text(), 'text/html');
            } finally { clearTimeout(timer); }
            doc.querySelectorAll('.post[id^="p"]').forEach(function (p) { postsById.set(p.id, p); });
            var posts = Array.from(postsById.values()).sort(function (a, b) { return Number(a.id.slice(1)) - Number(b.id.slice(1)); });
            var index = posts.findIndex(function (p) { return p.id === gmPost; });
            if (index > 0) {
                var attack = recordedAttack(posts[index - 1], posts[index]);
                if (attack && attack.id === actionId) return attack;
            }
            doc.querySelectorAll('a[href]').forEach(function (a) {
                try { var url = new URL(a.getAttribute('href'), location.origin);
                    if (url.origin === location.origin && /^\/t2227p\d+(?:-|$)/.test(url.pathname) &&
                        !seenPages.has(url.pathname) && !queue.includes(url.pathname)) queue.push(url.pathname);
                } catch (error) { /* Ignore unrelated links. */ }
            });
        }
        throw new Error('No matching attack declaration and native GM result were found. No defense was submitted.');
    }
    // Presentation only: original request and native GM result stay on the server.
    function combineGmCards() {
        if (!/^\/t2227(?:p\d+)?(?:-|$)/.test(location.pathname)) return;
        var posts = Array.from(document.querySelectorAll('.post[id^="p"]'));
        posts.forEach(function (request, index) {
            var source = request.querySelector('.br-post-content, .postbody .content');
            var gm = posts[index + 1];
            if (!source || !gm || gm.querySelector('.br-dice-gm-card')) return;
            var first = source.querySelector('strong, b');
            if (!first || !/^ROLL DECLARATION \/\/ BRD-[a-f0-9]{24}$/.test(first.textContent.trim())) return;
            var avatar = gm.querySelector('.postprofile-avatar[data-id]');
            if (!avatar || avatar.getAttribute('data-id') !== '332') return;
            var body = gm.querySelector('.br-post-content, .postbody .content');
            var name = request.querySelector('.postprofile-name');
            var member = body && body.querySelector('strong, b');
            if (!body || !name || !member || name.textContent.trim() !== member.textContent.trim()) return;
            var faces = Array.from(body.querySelectorAll('img[src]')).filter(function (img) {
                try { var url = new URL(img.getAttribute('src'), location.origin);
                    return url.hostname === 'astyrisc.github.io' && /^\/bleach-retribution\/(?:0[1-9]|1\d|20)-dice\.png$/.test(url.pathname);
                } catch (error) { return false; }
            });
            if (faces.length !== 1) return;
            var card = document.createElement('section');
            card.className = 'br-dice-gm-card';
            var title = document.createElement('h3');
            title.textContent = '01 // ACTION RECORD'; card.appendChild(title);
            var by = document.createElement('p');
            by.textContent = 'Requested by ' + name.textContent.trim() + ' // Native GM result below';
            card.appendChild(by);
            var details = document.createElement('div');
            details.className = 'br-dice-gm-details';
            // Copy only the declaration, stopping before any signature or unrelated text.
            var text = source.innerText || source.innerHTML.replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]*>/g, '');
            var end = 'Roll purpose is committed before the result. Do not reroll this action without an explicit recorded ruling.';
            var stop = text.indexOf(end);
            if (stop === -1) return;
            var clean = document.createElement('textarea');
            clean.innerHTML = text.slice(0, stop + end.length);
            details.textContent = clean.value; card.appendChild(details);
            var link = document.createElement('a');
            link.href = '#' + request.id.replace(/^p/, '');
            link.textContent = 'Show original request';
            link.addEventListener('click', function () { request.classList.remove('br-dice-request-folded'); });
            card.appendChild(link);
            var attack = recordedAttack(request, gm);
            if (attack) {
                var total = document.createElement('p');
                total.textContent = 'Attack total: D20 ' + attack.face + ' + declared modifier ' + attack.modifier + ' = ' + attack.total;
                card.appendChild(total);
                var defend = document.createElement('a'); defend.className = 'br-dice-defend';
                defend.href = '/post?t=2227&mode=reply&br_defend=' + gm.id.slice(1) + '&br_attack=' + attack.id;
                defend.textContent = 'Defend against this action'; card.appendChild(defend);
            }
            body.insertBefore(card, body.firstChild);
            request.classList.add('br-dice-request-folded');
            function revealAnchor() {
                if (location.hash.replace(/^#p?/, '') === request.id.replace(/^p/, '')) {
                    request.classList.remove('br-dice-request-folded');
                }
            }
            window.addEventListener('hashchange', revealAnchor); revealAnchor();
        });
    }
    combineGmCards();
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
    var linkedAttack = null, linking = false;
    var incomingPost = query.get('br_defend'), incomingId = query.get('br_attack');
    var hasIncoming = /^\d+$/.test(incomingPost || '') && /^BRD-[a-f0-9]{24}$/.test(incomingId || '');
    var historyKey = key + ':history';
    var record = null, ready = false, busy = false, timer = null, checking = false, frame;
    var panel = document.createElement('section');
    panel.id = 'br-dice-panel';
    panel.className = 'br-dice-panel';
    panel.setAttribute('aria-labelledby', 'br-dice-title');
    panel.innerHTML = '<h2 id="br-dice-title">01 // ACTION RESOLUTION // TEST</h2>' +
        '<p>Your roll declaration will be posted in Dice Rolls Test before your roleplay reply. ' +
        'The result is a native Forumotion roll; staff can still edit its record.</p>' +
        '<div id="br-dice-linked" role="status"></div>' +
        '<div class="br-dice-fields">' +
        '<label>Action<select id="br-dice-kind"><option>Defense</option><option>Attack</option><option>Other check</option></select></label>' +
        '<label>Technique<input id="br-dice-technique" type="text" maxlength="100" placeholder="Shunpo / Cero / sword strike" /></label>' +
        '<label>Stat<select id="br-dice-stat"><option>Mobility</option><option>Offense</option><option>Defense</option><option>Spiritual Arts</option><option>Intellect</option><option>Strength</option></select></label>' +
        '<label>Declared modifier<input id="br-dice-mod" type="number" min="0" max="20" step="1" value="0" /></label>' +
        '<label>Attack / opposing post URL<input id="br-dice-target" type="url" placeholder="Paste the attack post link" /></label>' +
        '<label>Opposing total (optional)<input id="br-dice-opposing" type="number" min="1" max="100" step="1" /></label>' +
        '<label>Native die<select id="br-dice-die"></select></label></div>' +
        '<p class="br-dice-note">Your modifier is declared, not checked against a character sheet. Linked attacks use the native GM face plus the attacker\'s declared modifier. Ties favor the defender. No damage is calculated here.</p>' +
        '<div class="br-dice-buttons"><button type="button" id="br-dice-roll" disabled>Post declaration &amp; roll</button>' +
        '<button type="button" id="br-dice-check" disabled>Check recorded result</button>' +
        '<button type="button" id="br-dice-insert" disabled>Attach result to draft</button>' +
        '<button type="button" id="br-dice-new" disabled>New action</button></div>' +
        '<p id="br-dice-status" role="status" aria-live="polite">Loading the native reply form...</p>' +
        '<div id="br-dice-result"></div><div id="br-dice-history"></div>';
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
        el('roll').disabled = !ready || busy || linking || Boolean(record);
        el('check').disabled = !record || busy;
        el('new').disabled = !record || record.state !== 'resolved' || busy || checking;
        el('insert').disabled = !record || record.state !== 'resolved' || busy;
        panel.querySelectorAll('.br-dice-fields input,.br-dice-fields select').forEach(function (input) {
            input.disabled = Boolean(record) || busy || linking;
        });
        el('target').readOnly = Boolean(linkedAttack);
        el('opposing').readOnly = Boolean(linkedAttack);
        if (linkedAttack && !record) el('kind').disabled = true;
    }
    function urlForPost(id) { return location.origin + '/t' + CONFIG.topic + '-dice-rolls-test#' + id.replace(/^p/, ''); }
    function addText(node, tag, text) { var item = document.createElement(tag); item.textContent = text; node.appendChild(item); return item; }
    function renderHistory() {
        var box = el('history'); box.replaceChildren();
        var history;
        try { history = JSON.parse(localStorage.getItem(historyKey) || '[]'); }
        catch (error) { return; }
        if (!Array.isArray(history) || !history.length) return;
        addText(box, 'h3', 'RECORDED ACTIONS');
        history.forEach(function (r) {
            var line = addText(box, 'p', r.kind + ' // ' + r.technique + ' // D20 ' + r.face + ' + ' + r.modifier + ' = ' + r.total + ' ');
            var link = addText(line, 'a', 'GM record'); link.href = r.resultUrl;
            link.target = '_blank'; link.rel = 'noopener';
        });
    }
    function render() {
        renderHistory();
        var box = el('result'); box.replaceChildren();
        if (!record) return;
        addText(box, 'p', record.kind + ' // ' + record.technique + ' // ' + record.stat + ' +' + record.modifier);
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
            '\nNative die: ' + r.dieName + ' // one roll\n' +
            'Opposing action: ' + (r.target || 'None specified') + '\n' +
            'Opposing total: ' + (r.opposing === null ? 'Not specified' : r.opposing) + '\n' +
            (r.attackId ? 'Opposing action ID: ' + r.attackId + '\n' : '') +
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
    if (record) { render(); status('An existing test roll was restored. Check its recorded result; use New action after its GM result is verified.'); }
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
                persist(record); busy = false; render(); status('Native result found. Attach this reference to your draft, or choose New action for a separate action.'); return true;
            }
            // A native submission may show a confirmation/meta-refresh page first.
            if (busy && Date.now() - record.created < CONFIG.timeout) {
                timer = setTimeout(checkResult, 1800); return;
            }
            busy = false; controls();
            status('No uniquely matching GM result was found. Open the test thread and check the declaration. Do not reroll; use Check recorded result after confirming it exists.');
        } catch (error) {
            busy = false; controls(); status('Could not verify the result. No retry roll was submitted. Check the test thread, then use Check recorded result.');
        } finally { checking = false; controls(); }
    }
    el('roll').addEventListener('click', async function () {
        if (busy || record || loadRecord()) { record = record || loadRecord(); render(); return; }
        if (linking) return;
        if (linkedAttack) {
            linking = true; controls(); status('Checking the linked attack record...');
            try {
                var latest = await readAttack(linkedAttack.gmPost, linkedAttack.id);
                if (latest.face !== linkedAttack.face || latest.modifier !== linkedAttack.modifier || latest.total !== linkedAttack.total || latest.technique !== linkedAttack.technique || latest.user !== linkedAttack.user) {
                    status('The linked attack changed. Reload this defense link and review it before rolling.'); return;
                }
            } catch (error) { status(error.message); return; }
            finally { linking = false; controls(); }
            if (loadRecord()) { record = loadRecord(); render(); return; }
        }
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
            opposing: opposing ? Number(opposing) : null, attackId: linkedAttack ? linkedAttack.id : null, dieName: el('die').selectedOptions[0].textContent.trim() };
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
            (record.attackId ? '\nResponding to action: ' + record.attackId + ' (total ' + record.opposing + ')' : '') +
            '\n[url=' + record.declarationUrl + ']Committed declaration[/url] | [url=' + record.resultUrl + ']Native GM result[/url]';
        if (editor) { editor.val(text + receipt); editor.updateOriginal(); } else { textarea.value = text + receipt; }
        status('Reference attached. Keep the native dice selector empty when sending this roleplay reply to avoid rolling again.');
    });
    el('new').addEventListener('click', async function () {
        if (!record || record.state !== 'resolved' || busy || checking) return;
        var previousId = record.id;
        busy = true; controls(); status('Confirming the GM record before opening a new action...');
        var confirmed = await checkResult();
        if (!confirmed || !record || record.id !== previousId || record.state !== 'resolved') return;
        // Refuse to discard another tab's pending action.
        var stored = loadRecord();
        if (!stored || stored.id !== previousId) {
            record = stored; render(); controls(); status('Another tab changed the active action. Its record has been restored.'); return;
        }
        try {
            var history = JSON.parse(localStorage.getItem(historyKey) || '[]');
            if (!Array.isArray(history)) throw new Error('Invalid history');
            if (!history.some(function (r) { return r.id === record.id; })) history.push(record);
            localStorage.setItem(historyKey, JSON.stringify(history));
            localStorage.removeItem(key);
        } catch (error) {
            status('Could not preserve the completed reference. The current action remains locked.'); return;
        }
        record = null; linkedAttack = null; ready = false; busy = false;
        el('technique').value = ''; el('mod').value = '0';
        el('target').value = ''; el('opposing').value = ''; el('kind').value = 'Defense';
        el('stat').value = 'Mobility'; el('die').replaceChildren();
        render(); controls(); status('Completed roll saved below. Loading a fresh form for your next action...');
        frame.src = '/post?t=' + CONFIG.topic + '&mode=reply&br_action=' + Date.now();
        linkedAttack = null; applyIncoming();
    });
    async function applyIncoming() {
        if (!hasIncoming) return;
        var box = el('linked'); box.replaceChildren();
        if (record) {
            addText(box, 'p', 'A defense link is waiting. Finish the current roll, attach its reference if needed, then choose New action.');
            return;
        }
        linking = true; controls();
        addText(box, 'p', 'Loading the selected attack record...');
        try {
            var attack = await readAttack('p' + incomingPost, incomingId);
            if (record || loadRecord()) { addText(box, 'p', 'An active roll was found. Finish it before loading this defense.'); return; }
            linkedAttack = attack; hasIncoming = false;
            var cleanUrl = new URL(location.href); cleanUrl.searchParams.delete('br_defend'); cleanUrl.searchParams.delete('br_attack');
            history.replaceState(null, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
            el('kind').value = 'Defense'; el('target').value = attack.resultUrl; el('opposing').value = attack.total;
            box.replaceChildren();
            addText(box, 'p', 'Responding to ' + attack.requester + ': ' + attack.technique + ' // Total ' + attack.total);
            addText(box, 'p', 'Action: ' + attack.id + '. Choose your defense technique, stat, and modifier.');
            var link = addText(box, 'a', 'View attack GM record'); link.href = attack.resultUrl; link.target = '_blank'; link.rel = 'noopener';
            var clear = addText(box, 'button', 'Use a manual reference instead'); clear.type = 'button';
            clear.addEventListener('click', function () {
                if (record || busy || linking) return;
                hasIncoming = false; linkedAttack = null; el('target').value = ''; el('opposing').value = '';
                box.replaceChildren(); controls();
            });
        } catch (error) {
            box.replaceChildren(); addText(box, 'p', error.message);
            // Keep automatic defense submission unavailable until explicitly switching to manual mode.
            hasIncoming = false;
            addText(box, 'p', 'You may enter a manual attack link and total, or reopen the Defend button to retry.');
        } finally { linking = false; controls(); }
    }
    applyIncoming();
    renderHistory();
    window.addEventListener('storage', function (event) { if (event.key === key) { record = loadRecord(); render(); controls(); } });
    controls();
})();
