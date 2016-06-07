// Created with Squiffy 5.0.0
// https://github.com/textadventures/squiffy

(function(){
/* jshint quotmark: single */
/* jshint evil: true */

var squiffy = {};

(function () {
    'use strict';

    squiffy.story = {};

    var initLinkHandler = function () {
        var handleLink = function (link) {
            if (link.hasClass('disabled')) return;
            var passage = link.data('passage');
            var section = link.data('section');
            var rotateAttr = link.attr('data-rotate');
            var sequenceAttr = link.attr('data-sequence');
            if (passage) {
                disableLink(link);
                squiffy.set('_turncount', squiffy.get('_turncount') + 1);
                passage = processLink(passage);
                if (passage) {
                    currentSection.append('<hr/>');
                    squiffy.story.passage(passage);
                }
                var turnPassage = '@' + squiffy.get('_turncount');
                if (turnPassage in squiffy.story.section.passages) {
                    squiffy.story.passage(turnPassage);
                }
            }
            else if (section) {
                currentSection.append('<hr/>');
                disableLink(link);
                section = processLink(section);
                squiffy.story.go(section);
            }
            else if (rotateAttr || sequenceAttr) {
                var result = rotate(rotateAttr || sequenceAttr, rotateAttr ? link.text() : '');
                link.html(result[0].replace(/&quot;/g, '"').replace(/&#39;/g, '\''));
                var dataAttribute = rotateAttr ? 'data-rotate' : 'data-sequence';
                link.attr(dataAttribute, result[1]);
                if (!result[1]) {
                    disableLink(link);
                }
                if (link.attr('data-attribute')) {
                    squiffy.set(link.attr('data-attribute'), result[0]);
                }
                squiffy.story.save();
            }
        };

        squiffy.ui.output.on('click', 'a.squiffy-link', function () {
            handleLink(jQuery(this));
        });

        squiffy.ui.output.on('keypress', 'a.squiffy-link', function (e) {
            if (e.which !== 13) return;
            handleLink(jQuery(this));
        });

        squiffy.ui.output.on('mousedown', 'a.squiffy-link', function (event) {
            event.preventDefault();
        });
    };

    var disableLink = function (link) {
        link.addClass('disabled');
        link.attr('tabindex', -1);
    }
    
    squiffy.story.begin = function () {
        if (!squiffy.story.load()) {
            squiffy.story.go(squiffy.story.start);
        }
    };

    var processLink = function(link) {
        var sections = link.split(',');
        var first = true;
        var target = null;
        sections.forEach(function (section) {
            section = section.trim();
            if (startsWith(section, '@replace ')) {
                replaceLabel(section.substring(9));
            }
            else {
                if (first) {
                    target = section;
                }
                else {
                    setAttribute(section);
                }
            }
            first = false;
        });
        return target;
    };

    var setAttribute = function(expr) {
        var lhs, rhs, op, value;
        var setRegex = /^([\w]*)\s*=\s*(.*)$/;
        var setMatch = setRegex.exec(expr);
        if (setMatch) {
            lhs = setMatch[1];
            rhs = setMatch[2];
            if (isNaN(rhs)) {
                squiffy.set(lhs, rhs);
            }
            else {
                squiffy.set(lhs, parseFloat(rhs));
            }
        }
        else {
            var incDecRegex = /^([\w]*)\s*([\+\-])=\s*(.*)$/;
            var incDecMatch = incDecRegex.exec(expr);
            if (incDecMatch) {
                lhs = incDecMatch[1];
                op = incDecMatch[2];
                rhs = parseFloat(incDecMatch[3]);
                value = squiffy.get(lhs);
                if (value === null) value = 0;
                if (op == '+') {
                    value += rhs;
                }
                if (op == '-') {
                    value -= rhs;
                }
                squiffy.set(lhs, value);
            }
            else {
                value = true;
                if (startsWith(expr, 'not ')) {
                    expr = expr.substring(4);
                    value = false;
                }
                squiffy.set(expr, value);
            }
        }
    };

    var replaceLabel = function(expr) {
        var regex = /^([\w]*)\s*=\s*(.*)$/;
        var match = regex.exec(expr);
        if (!match) return;
        var label = match[1];
        var text = match[2];
        if (text in squiffy.story.section.passages) {
            text = squiffy.story.section.passages[text].text;
        }
        else if (text in squiffy.story.sections) {
            text = squiffy.story.sections[text].text;
        }
        var stripParags = /^<p>(.*)<\/p>$/;
        var stripParagsMatch = stripParags.exec(text);
        if (stripParagsMatch) {
            text = stripParagsMatch[1];
        }
        var $labels = squiffy.ui.output.find('.squiffy-label-' + label);
        $labels.fadeOut(1000, function() {
            $labels.html(squiffy.ui.processText(text));
            $labels.fadeIn(1000, function() {
                squiffy.story.save();
            });
        });
    };

    squiffy.story.go = function(section) {
        squiffy.set('_transition', null);
        newSection();
        squiffy.story.section = squiffy.story.sections[section];
        if (!squiffy.story.section) return;
        squiffy.set('_section', section);
        setSeen(section);
        var master = squiffy.story.sections[''];
        if (master) {
            squiffy.story.run(master);
            squiffy.ui.write(master.text);
        }
        squiffy.story.run(squiffy.story.section);
        // The JS might have changed which section we're in
        if (squiffy.get('_section') == section) {
            squiffy.set('_turncount', 0);
            squiffy.ui.write(squiffy.story.section.text);
            squiffy.story.save();
        }
    };

    squiffy.story.run = function(section) {
        if (section.clear) {
            squiffy.ui.clearScreen();
        }
        if (section.attributes) {
            processAttributes(section.attributes);
        }
        if (section.js) {
            section.js();
        }
    };

    squiffy.story.passage = function(passageName) {
        var passage = squiffy.story.section.passages[passageName];
        if (!passage) return;
        setSeen(passageName);
        var masterSection = squiffy.story.sections[''];
        if (masterSection) {
            var masterPassage = masterSection.passages[''];
            if (masterPassage) {
                squiffy.story.run(masterPassage);
                squiffy.ui.write(masterPassage.text);
            }
        }
        var master = squiffy.story.section.passages[''];
        if (master) {
            squiffy.story.run(master);
            squiffy.ui.write(master.text);
        }
        squiffy.story.run(passage);
        squiffy.ui.write(passage.text);
        squiffy.story.save();
    };

    var processAttributes = function(attributes) {
        attributes.forEach(function (attribute) {
            if (startsWith(attribute, '@replace ')) {
                replaceLabel(attribute.substring(9));
            }
            else {
                setAttribute(attribute);
            }
        });
    };

    squiffy.story.restart = function() {
        if (squiffy.ui.settings.persist && window.localStorage) {
            var keys = Object.keys(localStorage);
            jQuery.each(keys, function (idx, key) {
                if (startsWith(key, squiffy.story.id)) {
                    localStorage.removeItem(key);
                }
            });
        }
        else {
            squiffy.storageFallback = {};
        }
        if (squiffy.ui.settings.scroll === 'element') {
            squiffy.ui.output.html('');
            squiffy.story.begin();
        }
        else {
            location.reload();
        }
    };

    squiffy.story.save = function() {
        squiffy.set('_output', squiffy.ui.output.html());
    };

    squiffy.story.load = function() {
        var output = squiffy.get('_output');
        if (!output) return false;
        squiffy.ui.output.html(output);
        currentSection = jQuery('#' + squiffy.get('_output-section'));
        squiffy.story.section = squiffy.story.sections[squiffy.get('_section')];
        var transition = squiffy.get('_transition');
        if (transition) {
            eval('(' + transition + ')()');
        }
        return true;
    };

    var setSeen = function(sectionName) {
        var seenSections = squiffy.get('_seen_sections');
        if (!seenSections) seenSections = [];
        if (seenSections.indexOf(sectionName) == -1) {
            seenSections.push(sectionName);
            squiffy.set('_seen_sections', seenSections);
        }
    };

    squiffy.story.seen = function(sectionName) {
        var seenSections = squiffy.get('_seen_sections');
        if (!seenSections) return false;
        return (seenSections.indexOf(sectionName) > -1);
    };
    
    squiffy.ui = {};

    var currentSection = null;
    var screenIsClear = true;
    var scrollPosition = 0;

    var newSection = function() {
        if (currentSection) {
            disableLink(jQuery('.squiffy-link', currentSection));
        }
        var sectionCount = squiffy.get('_section-count') + 1;
        squiffy.set('_section-count', sectionCount);
        var id = 'squiffy-section-' + sectionCount;
        currentSection = jQuery('<div/>', {
            id: id,
        }).appendTo(squiffy.ui.output);
        squiffy.set('_output-section', id);
    };

    squiffy.ui.write = function(text) {
        screenIsClear = false;
        scrollPosition = squiffy.ui.output.height();
        currentSection.append(jQuery('<div/>').html(squiffy.ui.processText(text)));
        squiffy.ui.scrollToEnd();
    };

    squiffy.ui.clearScreen = function() {
        squiffy.ui.output.html('');
        screenIsClear = true;
        newSection();
    };

    squiffy.ui.scrollToEnd = function() {
        var scrollTo, currentScrollTop, distance, duration;
        if (squiffy.ui.settings.scroll === 'element') {
            scrollTo = squiffy.ui.output[0].scrollHeight - squiffy.ui.output.height();
            currentScrollTop = squiffy.ui.output.scrollTop();
            if (scrollTo > currentScrollTop) {
                distance = scrollTo - currentScrollTop;
                duration = distance / 0.4;
                squiffy.ui.output.stop().animate({ scrollTop: scrollTo }, duration);
            }
        }
        else {
            scrollTo = scrollPosition;
            currentScrollTop = Math.max(jQuery('body').scrollTop(), jQuery('html').scrollTop());
            if (scrollTo > currentScrollTop) {
                var maxScrollTop = jQuery(document).height() - jQuery(window).height();
                if (scrollTo > maxScrollTop) scrollTo = maxScrollTop;
                distance = scrollTo - currentScrollTop;
                duration = distance / 0.5;
                jQuery('body,html').stop().animate({ scrollTop: scrollTo }, duration);
            }
        }
    };

    squiffy.ui.processText = function(text) {
        function process(text, data) {
            var containsUnprocessedSection = false;
            var open = text.indexOf('{');
            var close;
            
            if (open > -1) {
                var nestCount = 1;
                var searchStart = open + 1;
                var finished = false;
             
                while (!finished) {
                    var nextOpen = text.indexOf('{', searchStart);
                    var nextClose = text.indexOf('}', searchStart);
         
                    if (nextClose > -1) {
                        if (nextOpen > -1 && nextOpen < nextClose) {
                            nestCount++;
                            searchStart = nextOpen + 1;
                        }
                        else {
                            nestCount--;
                            searchStart = nextClose + 1;
                            if (nestCount === 0) {
                                close = nextClose;
                                containsUnprocessedSection = true;
                                finished = true;
                            }
                        }
                    }
                    else {
                        finished = true;
                    }
                }
            }
            
            if (containsUnprocessedSection) {
                var section = text.substring(open + 1, close);
                var value = processTextCommand(section, data);
                text = text.substring(0, open) + value + process(text.substring(close + 1), data);
            }
            
            return (text);
        }

        function processTextCommand(text, data) {
            if (startsWith(text, 'if ')) {
                return processTextCommand_If(text, data);
            }
            else if (startsWith(text, 'else:')) {
                return processTextCommand_Else(text, data);
            }
            else if (startsWith(text, 'label:')) {
                return processTextCommand_Label(text, data);
            }
            else if (/^rotate[: ]/.test(text)) {
                return processTextCommand_Rotate('rotate', text, data);
            }
            else if (/^sequence[: ]/.test(text)) {
                return processTextCommand_Rotate('sequence', text, data);   
            }
            else if (text in squiffy.story.section.passages) {
                return process(squiffy.story.section.passages[text].text, data);
            }
            else if (text in squiffy.story.sections) {
                return process(squiffy.story.sections[text].text, data);
            }
            return squiffy.get(text);
        }

        function processTextCommand_If(section, data) {
            var command = section.substring(3);
            var colon = command.indexOf(':');
            if (colon == -1) {
                return ('{if ' + command + '}');
            }

            var text = command.substring(colon + 1);
            var condition = command.substring(0, colon);

            var operatorRegex = /([\w ]*)(=|&lt;=|&gt;=|&lt;&gt;|&lt;|&gt;)(.*)/;
            var match = operatorRegex.exec(condition);

            var result = false;

            if (match) {
                var lhs = squiffy.get(match[1]);
                var op = match[2];
                var rhs = match[3];

                if (op == '=' && lhs == rhs) result = true;
                if (op == '&lt;&gt;' && lhs != rhs) result = true;
                if (op == '&gt;' && lhs > rhs) result = true;
                if (op == '&lt;' && lhs < rhs) result = true;
                if (op == '&gt;=' && lhs >= rhs) result = true;
                if (op == '&lt;=' && lhs <= rhs) result = true;
            }
            else {
                var checkValue = true;
                if (startsWith(condition, 'not ')) {
                    condition = condition.substring(4);
                    checkValue = false;
                }

                if (startsWith(condition, 'seen ')) {
                    result = (squiffy.story.seen(condition.substring(5)) == checkValue);
                }
                else {
                    var value = squiffy.get(condition);
                    if (value === null) value = false;
                    result = (value == checkValue);
                }
            }

            var textResult = result ? process(text, data) : '';

            data.lastIf = result;
            return textResult;
        }

        function processTextCommand_Else(section, data) {
            if (!('lastIf' in data) || data.lastIf) return '';
            var text = section.substring(5);
            return process(text, data);
        }

        function processTextCommand_Label(section, data) {
            var command = section.substring(6);
            var eq = command.indexOf('=');
            if (eq == -1) {
                return ('{label:' + command + '}');
            }

            var text = command.substring(eq + 1);
            var label = command.substring(0, eq);

            return '<span class="squiffy-label-' + label + '">' + process(text, data) + '</span>';
        }

        function processTextCommand_Rotate(type, section, data) {
            var options;
            var attribute = '';
            if (section.substring(type.length, type.length + 1) == ' ') {
                var colon = section.indexOf(':');
                if (colon == -1) {
                    return '{' + section + '}';
                }
                options = section.substring(colon + 1);
                attribute = section.substring(type.length + 1, colon);
            }
            else {
                options = section.substring(type.length + 1);
            }
            var rotation = rotate(options.replace(/"/g, '&quot;').replace(/'/g, '&#39;'));
            if (attribute) {
                squiffy.set(attribute, rotation[0]);
            }
            return '<a class="squiffy-link" data-' + type + '="' + rotation[1] + '" data-attribute="' + attribute + '" role="link">' + rotation[0] + '</a>';
        }

        var data = {
            fulltext: text
        };
        return process(text, data);
    };

    squiffy.ui.transition = function(f) {
        squiffy.set('_transition', f.toString());
        f();
    };

    squiffy.storageFallback = {};

    squiffy.set = function(attribute, value) {
        if (typeof value === 'undefined') value = true;
        if (squiffy.ui.settings.persist && window.localStorage) {
            localStorage[squiffy.story.id + '-' + attribute] = JSON.stringify(value);
        }
        else {
            squiffy.storageFallback[attribute] = JSON.stringify(value);
        }
        squiffy.ui.settings.onSet(attribute, value);
    };

    squiffy.get = function(attribute) {
        var result;
        if (squiffy.ui.settings.persist && window.localStorage) {
            result = localStorage[squiffy.story.id + '-' + attribute];
        }
        else {
            result = squiffy.storageFallback[attribute];
        }
        if (!result) return null;
        return JSON.parse(result);
    };

    var startsWith = function(string, prefix) {
        return string.substring(0, prefix.length) === prefix;
    };

    var rotate = function(options, current) {
        var colon = options.indexOf(':');
        if (colon == -1) {
            return [options, current];
        }
        var next = options.substring(0, colon);
        var remaining = options.substring(colon + 1);
        if (current) remaining += ':' + current;
        return [next, remaining];
    };

    var methods = {
        init: function (options) {
            var settings = jQuery.extend({
                scroll: 'body',
                persist: true,
                restartPrompt: true,
                onSet: function (attribute, value) {}
            }, options);

            squiffy.ui.output = this;
            squiffy.ui.restart = jQuery(settings.restart);
            squiffy.ui.settings = settings;

            if (settings.scroll === 'element') {
                squiffy.ui.output.css('overflow-y', 'auto');
            }

            initLinkHandler();
            squiffy.story.begin();
            
            return this;
        },
        get: function (attribute) {
            return squiffy.get(attribute);
        },
        set: function (attribute, value) {
            squiffy.set(attribute, value);
        },
        restart: function () {
            if (!squiffy.ui.settings.restartPrompt || confirm('Are you sure you want to restart?')) {
                squiffy.story.restart();
            }
        }
    };

    jQuery.fn.squiffy = function (methodOrOptions) {
        if (methods[methodOrOptions]) {
            return methods[methodOrOptions]
                .apply(this, Array.prototype.slice.call(arguments, 1));
        }
        else if (typeof methodOrOptions === 'object' || ! methodOrOptions) {
            return methods.init.apply(this, arguments);
        } else {
            jQuery.error('Method ' +  methodOrOptions + ' does not exist');
        }
    };
})();

var get = squiffy.get;
var set = squiffy.set;


squiffy.story.start = '_default';
squiffy.story.id = '7d35292c52';
squiffy.story.sections = {
	'_default': {
		'text': "<!-- Global Variables ----------------------------------------------------- -->\n<!-- Resuscitation Variables ---------------------------------------------- -->\n<!-- Diagnosis Variables -------------------------------------------------- -->\n<!-- Treatment Variables -------------------------------------------------- -->\n<!-- ---------------------------------------------------------------------- -->\n<p><b>Initial Exam</b></p>\n<p>You are consulted by the Emergency Department for a 41 year old woman who presents with postprandial RUQ pain for 1 day. The pain is associated with nausea and vomiting. She denies fevers.</p>\n<p><br>\n<b>I will get more <a class=\"squiffy-link link-section\" data-section=\"History\" role=\"link\" tabindex=\"0\">history</a> from the patient.</b>\n<!-- ###################################################################### --></p>",
		'attributes': ["_temp = 100","_hr = 80","_sbp = 124","_a_sbp = 129","_dbp = 86","_a_dbp = 91","_rr = 16","_sat = 100","_rbc = 0","_ffp = 0","_platelets = 0","_diagnostic_tests = 0"],
		'passages': {
		},
	},
	'History': {
		'clear': true,
		'text': "<p><b>History</b></p>\n<p>Past Medical History: Fibroids<br>\nPast Surgical History: Cesarean Section, Appendectomy<br>\nMedications: None<br>\nAllergies: Shellfish<br>\nSocial History: 20 pack year history of tobacco<br></p>\n<p><br>\n<b>I will then perform a focused <a class=\"squiffy-link link-section\" data-section=\"Physical Exam\" role=\"link\" tabindex=\"0\">physical exam</a>.</b></p>\n<!-- ###################################################################### -->",
		'passages': {
		},
	},
	'Physical Exam': {
		'clear': true,
		'text': "<p><b>Physical Exam</b></p>\n<p>T: {_temp} F<br>\nHR: {_hr} bpm<br>\nBP: {_sbp}/{_dbp} mm Hg<br>\nRR: {_rr}<br>\nO2 Sat: {_sat}% on room air<br>\nGeneral: Alert and Oriented x 3, non-toxic appearing<br>\nHEENT: Anicteric<br>\nAbdomen: Soft, non-distended, Right Upper Quadrant tenderness to palpation, negative Murphy&#39;s sign<br></p>\n<p><br>\n<b><i>What is your <a class=\"squiffy-link link-section\" data-section=\"next step\" role=\"link\" tabindex=\"0\">next step</a>?</i></b></p>\n<!-- ###################################################################### -->",
		'passages': {
		},
	},
	'next step': {
		'clear': true,
		'text': "<p><b>I will <a class=\"squiffy-link link-passage\" data-passage=\"Reassess\" role=\"link\" tabindex=\"0\">reassess</a> the patient.</b><br>\n{if not _resuscitation: <b>I will <a class=\"squiffy-link link-section\" data-section=\"Resuscitate\" role=\"link\" tabindex=\"0\">resuscitate</a> the patient.</b><br>}{else: <b>I will continue to <a class=\"squiffy-link link-section\" data-section=\"Resuscitate\" role=\"link\" tabindex=\"0\">resuscitate</a> the patient.</b><br>}\n{if not _diagnostic_tests: <b>I will order <a class=\"squiffy-link link-section\" data-section=\"Diagnostic Tests\" role=\"link\" tabindex=\"0\">diagnostic tests</a>.</b><br>}{else: <b>I will get more <a class=\"squiffy-link link-section\" data-section=\"Diagnostic Tests\" role=\"link\" tabindex=\"0\">diagnostic tests</a>.</b><br>}\n{if not _treatment: <b>I will <a class=\"squiffy-link link-section\" data-section=\"Treatment\" role=\"link\" tabindex=\"0\">treat</a> the patient.</b><br>}{else:<br>}</p>\n<!-- ###################################################################### -->",
		'passages': {
			'Reassess': {
				'clear': true,
				'text': "<p><b><i>Your reexamination of the patient reveals:</i></b></p>\n<p><b>Vitals</b><br>\nT: {_temp} F<br>\nHR: {_hr} bpm<br>\nBP: {_sbp}/{_dbp} mm Hg<br>\nRR: {_rr}<br>\nO2 Sat: {_sat}% on room air<br></p>\n<p><b>Physical Exam</b><br>\nGeneral: Alert and Oriented x 3, non-toxic appearing<br>\nHEENT: Anicteric<br>\nAbdomen: Soft, non-distended, Right Upper Quadrant tenderness to palpation, negative Murphy&#39;s sign<br></p>\n<p>{if _ivs: 2 large bore IVs are in place {if _crystalloids: with crystalloid running}{if _colloids: with colloid running}{if _rbc: with red blood cells running}{if _ffp: with fresh forzen plasma running}{if _platelets: with platelets running}{if _mtp: with Massive Transfusion Protocol initiated}<br>}\n{if _foley: Foley is in place with {_uop} cc of urine<br>}\n{if _aline: Arterial line is in place showing BP of {_a_sbp}/{_a_dbp}<br>}\n{if _cvc: Central venous catheter is in place<br>}</p>\n<p>{if _diagnostic_tests&gt;0: <b>Diagnostic Tests</b><br>}{else:}\n{if _cbc: CBC: {_cbc_value}<br>}\n{if _bmp: BMP: {_bmp_value}<br>}\n{if _lft: LFTs: {_lft_value}<br>}\n{if _ptinrptt: PT/INR/PTT: {_ptinrptt_value}<br>}</p>\n<p>{if _ruqus: RUQ US: {_ruqus_value}<br>}\n{if _ctabd: CT Abdomen: {_ctabd_value}<br>}\n{if _mrcp: MRCP: {_mrcp_value}<br>}\n{if _ercp: ERCP: {_ercp_value}<br>}\n{if _ptc: PTC: {_ptc_value}<br>}</p>\n<p><br>\n<b><i><a class=\"squiffy-link link-section\" data-section=\"next step\" role=\"link\" tabindex=\"0\">Return</a></i></b></p>\n<!-- ###################################################################### -->",
			},
		},
	},
	'Resuscitate': {
		'clear': true,
		'text': "<p><b>Resuscitation</b></p>\n<p><b>I will {if not _ivs: <a class=\"squiffy-link link-passage\" data-passage=\"Get Access\" role=\"link\" tabindex=\"0\">place 2 large bore IVs</a></b><br>}{else: <a class=\"squiffy-link link-passage\" data-passage=\"Give Fluids\" role=\"link\" tabindex=\"0\">give additional fluids</a></b><br>}\n{if not _foley: <b>I will <a class=\"squiffy-link link-passage\" data-passage=\"Place Foley catheter\" role=\"link\" tabindex=\"0\">place a Foley catheter</a></b><br>}{else:}\n{if not _aline: <b>I will <a class=\"squiffy-link link-passage\" data-passage=\"Place arterial line\" role=\"link\" tabindex=\"0\">place an arterial line</a></b><br>}{else:}\n{if not _cvc: <b>I will <a class=\"squiffy-link link-passage\" data-passage=\"Place central venous catheter\" role=\"link\" tabindex=\"0\">place a central venous catheter</a></b><br>}{else:}</p>\n<p><br>\n<b><i>What is your <a class=\"squiffy-link link-section\" data-section=\"next step\" role=\"link\" tabindex=\"0\">next step</a>?</i></b></p>\n<!-- ---------------------------------------------------------------------- -->",
		'attributes': ["_resuscitation"],
		'passages': {
			'Get Access': {
				'clear': true,
				'text': "<p><b>I will give a bolus of <a class=\"squiffy-link link-passage\" data-passage=\"crystalloids\" role=\"link\" tabindex=\"0\">crystalloids</a></b><br>\n<b>I will give a bolus of <a class=\"squiffy-link link-passage\" data-passage=\"colloids\" role=\"link\" tabindex=\"0\">colloids</a></b><br>\n<b>I will give <a class=\"squiffy-link link-passage\" data-passage=\"blood products\" role=\"link\" tabindex=\"0\">blood products</a></b><br>\n<b>I will start the <a class=\"squiffy-link link-passage\" data-passage=\"Massive Transfusion Protocol\" role=\"link\" tabindex=\"0\">Massive Transfusion Protocol</a></b><br></p>\n<!-- ---------------------------------------------------------------------- -->",
				'attributes': ["_ivs"],
			},
			'Give Fluids': {
				'clear': true,
				'text': "<p>Give bolus of <a class=\"squiffy-link link-passage\" data-passage=\"crystalloids\" role=\"link\" tabindex=\"0\">crystalloids</a><br>\nGive bolus of <a class=\"squiffy-link link-passage\" data-passage=\"colloids\" role=\"link\" tabindex=\"0\">colloids</a><br>\nGive <a class=\"squiffy-link link-passage\" data-passage=\"blood products\" role=\"link\" tabindex=\"0\">blood products</a><br>\nStart <a class=\"squiffy-link link-passage\" data-passage=\"Massive Transfusion Protocol\" role=\"link\" tabindex=\"0\">Massive Transfusion Protocol</a><br></p>\n<!-- ---------------------------------------------------------------------- -->",
			},
			'crystalloids': {
				'clear': true,
				'text': "<p><b><i>You start giving a 1 liter bolus of crystalloid.</i></b></p>\n<p><br>\n<b><i><a class=\"squiffy-link link-section\" data-section=\"Resuscitate\" role=\"link\" tabindex=\"0\">Return</a></i></b></p>\n<!-- ---------------------------------------------------------------------- -->",
				'attributes': ["_crystalloids"],
			},
			'colloids': {
				'clear': true,
				'text': "<p><b><i>You start giving a bolus of colloid.</i></b></p>\n<p><br>\n<b><i><a class=\"squiffy-link link-section\" data-section=\"Resuscitate\" role=\"link\" tabindex=\"0\">Return</a></i></b></p>\n<!-- ---------------------------------------------------------------------- -->",
				'attributes': ["_colloids"],
			},
			'Massive Transfusion Protocol': {
				'clear': true,
				'text': "<p><b><i>You star the Massive Transfusion Protocol.</i></b></p>\n<p><br>\n<b><i><a class=\"squiffy-link link-section\" data-section=\"Resuscitate\" role=\"link\" tabindex=\"0\">Return</a></i></b></p>\n<!-- ---------------------------------------------------------------------- -->",
				'attributes': ["_mtp"],
			},
			'blood products': {
				'clear': true,
				'text': "<p><b>I will give <a class=\"squiffy-link link-passage\" data-passage=\"red blood cells\" role=\"link\" tabindex=\"0\">red blood cells</a></b><br>\n<b>I will give <a class=\"squiffy-link link-passage\" data-passage=\"fresh frozen plasma\" role=\"link\" tabindex=\"0\">fresh frozen plasma</a></b><br>\n<b>I will give <a class=\"squiffy-link link-passage\" data-passage=\"platelets\" role=\"link\" tabindex=\"0\">platelets</a></b><br></p>\n<!-- ---------------------------------------------------------------------- -->",
			},
			'red blood cells': {
				'clear': true,
				'text': "<p><b><i>You start giving 1 unit of red blood cells.</i></b></p>\n<p><br>\n<b><i><a class=\"squiffy-link link-section\" data-section=\"Resuscitate\" role=\"link\" tabindex=\"0\">Return</a></i></b></p>\n<!-- ---------------------------------------------------------------------- -->",
				'attributes': ["_rbc+=1"],
			},
			'fresh frozen plasma': {
				'clear': true,
				'text': "<p><b><i>You start giving 1 unit of fresh frozen plasma.</i></b></p>\n<p><br>\n<b><i><a class=\"squiffy-link link-section\" data-section=\"Resuscitate\" role=\"link\" tabindex=\"0\">Return</a></i></b></p>\n<!-- ---------------------------------------------------------------------- -->",
				'attributes': ["_ffp+=1"],
			},
			'platelets': {
				'clear': true,
				'text': "<p><b><i>You start giving 1 unit of platelets.</i></b></p>\n<p><br>\n<b><i><a class=\"squiffy-link link-section\" data-section=\"Resuscitate\" role=\"link\" tabindex=\"0\">Return</a></i></b></p>\n<!-- ---------------------------------------------------------------------- -->",
				'attributes': ["_platelets+=1"],
			},
			'Place Foley catheter': {
				'clear': true,
				'text': "<p><b><i>You place a Foley catheter which returns {_uop} cc of tea colored urine.</i></b></p>\n<p><br>\n<b><i><a class=\"squiffy-link link-section\" data-section=\"Resuscitate\" role=\"link\" tabindex=\"0\">Return</a></i></b></p>\n<!-- ---------------------------------------------------------------------- -->",
				'attributes': ["_foley","_uop = 40"],
			},
			'Place arterial line': {
				'clear': true,
				'text': "<p><b><i>You successfully place an arterial line.</i></b></p>\n<p><br>\n<b><i><a class=\"squiffy-link link-section\" data-section=\"Resuscitate\" role=\"link\" tabindex=\"0\">Return</a></i></b></p>\n<!-- ---------------------------------------------------------------------- -->",
				'attributes': ["_aline"],
			},
			'Place central venous catheter': {
				'clear': true,
				'text': "<p><b><i>You successfully place a central venous catheter.</i></b></p>\n<p><br>\n<b><i><a class=\"squiffy-link link-section\" data-section=\"Resuscitate\" role=\"link\" tabindex=\"0\">Return</a></i></b></p>\n<!-- ###################################################################### -->",
				'attributes': ["_cvc"],
			},
		},
	},
	'Diagnostic Tests': {
		'clear': true,
		'text': "<p><b>Diagnostic Tests</b></p>\n<p><b>I will order a <a class=\"squiffy-link link-passage\" data-passage=\"CBC\" role=\"link\" tabindex=\"0\">CBC</a></b><br>\n<b>I will order a <a class=\"squiffy-link link-passage\" data-passage=\"BMP\" role=\"link\" tabindex=\"0\">BMP</a></b><br>\n<b>I will order <a class=\"squiffy-link link-passage\" data-passage=\"LFTs\" role=\"link\" tabindex=\"0\">LFTs</a></b><br>\n<b>I will order <a class=\"squiffy-link link-passage\" data-passage=\"PT/INR/PTT\" role=\"link\" tabindex=\"0\">PT/INR/PTT</a></b><br>\n<b>I will order <a class=\"squiffy-link link-passage\" data-passage=\"Lipase\" role=\"link\" tabindex=\"0\">Lipase</a></b><br>\n<b>I will order <a class=\"squiffy-link link-passage\" data-passage=\"Lactate\" role=\"link\" tabindex=\"0\">Lactate</a></b><br>\n<b>I will order a <a class=\"squiffy-link link-passage\" data-passage=\"Urine Pregnancy Test\" role=\"link\" tabindex=\"0\">Urine Pregnancy Test</a></b><br>\n<b>I will order a <a class=\"squiffy-link link-passage\" data-passage=\"Right Upper Quadrant Ultrasound\" role=\"link\" tabindex=\"0\">Right Upper Quadrant Ultrasound</a></b><br>\n<b>I will order a <a class=\"squiffy-link link-passage\" data-passage=\"CT Abdomen\" role=\"link\" tabindex=\"0\">CT Abdomen</a></b><br>\n<b>I will order a <a class=\"squiffy-link link-passage\" data-passage=\"MRCP\" role=\"link\" tabindex=\"0\">MRCP</a></b><br>\n<b>I will order a <a class=\"squiffy-link link-passage\" data-passage=\"HIDA Scan\" role=\"link\" tabindex=\"0\">HIDA Scan</a></b><br></p>\n<p><br>\n<b><i>What is your <a class=\"squiffy-link link-section\" data-section=\"next step\" role=\"link\" tabindex=\"0\">next step</a>?</i></b></p>\n<!-- ---------------------------------------------------------------------- -->",
		'passages': {
			'CBC': {
				'clear': true,
				'text': "<p>CBC: {_cbc_value}</p>\n<p><br>\n<b><i><a class=\"squiffy-link link-section\" data-section=\"Diagnostic Tests\" role=\"link\" tabindex=\"0\">Return</a></i></b></p>\n<!-- ---------------------------------------------------------------------- -->",
				'attributes': ["_diagnostic_tests+=1","_cbc","_cbc_value = 6.5 > 13.0 / 39.2 < 250"],
			},
			'BMP': {
				'clear': true,
				'text': "<p>BMP: {_bmp_value}</p>\n<p><br>\n<b><i><a class=\"squiffy-link link-section\" data-section=\"Diagnostic Tests\" role=\"link\" tabindex=\"0\">Return</a></i></b></p>\n<!-- ---------------------------------------------------------------------- -->",
				'attributes': ["_diagnostic_tests+=1","_bmp","_bmp_value = 139 / 3.8 / 103 / 29 / 8 / 0.7 < 104"],
			},
			'LFTs': {
				'clear': true,
				'text': "<p>LFTs: {_lft_value}</p>\n<p><br>\n<b><i><a class=\"squiffy-link link-section\" data-section=\"Diagnostic Tests\" role=\"link\" tabindex=\"0\">Return</a></i></b></p>\n<!-- ---------------------------------------------------------------------- -->",
				'attributes': ["_diagnostic_tests+=1","_lft","_lft_value = 7.3 / 3.7 / 448 / 887 / 392 / 4.6"],
			},
			'PT/INR/PTT': {
				'clear': true,
				'text': "<p>PT/INR/PTT: {_ptinrptt_value}</p>\n<p><br>\n<b><i><a class=\"squiffy-link link-section\" data-section=\"Diagnostic Tests\" role=\"link\" tabindex=\"0\">Return</a></i></b></p>\n<!-- ---------------------------------------------------------------------- -->",
				'attributes': ["_diagnostic_tests+=1","_ptinrptt","_ptinrptt_value = 12 seconds / 1.2 / 25 seconds"],
			},
			'Lipase': {
				'clear': true,
				'text': "<p>Lipase: {_lipase_value}</p>\n<p><br>\n<b><i><a class=\"squiffy-link link-section\" data-section=\"Diagnostic Tests\" role=\"link\" tabindex=\"0\">Return</a></i></b></p>\n<!-- ---------------------------------------------------------------------- -->",
				'attributes': ["_diagnostic_tests+=1","_lipase","_lipase_value = 61 Units/L"],
			},
			'Lactate': {
				'clear': true,
				'text': "<p>Lipase: {_lactate_value}</p>\n<p><br>\n<b><i><a class=\"squiffy-link link-section\" data-section=\"Diagnostic Tests\" role=\"link\" tabindex=\"0\">Return</a></i></b></p>\n<!-- ---------------------------------------------------------------------- -->",
				'attributes': ["_diagnostic_tests+=1","_lactate","_lactate_value = 1.1 mmol/L"],
			},
			'Urine Pregnancy Test': {
				'clear': true,
				'text': "<p>Urine Pregnancy: {_upreg_value}</p>\n<p><br>\n<b><i><a class=\"squiffy-link link-section\" data-section=\"Diagnostic Tests\" role=\"link\" tabindex=\"0\">Return</a></i></b></p>\n<!-- ---------------------------------------------------------------------- -->",
				'attributes': ["_diagnostic_tests+=1","_upreg","_upreg_value = Negative"],
			},
			'Right Upper Quadrant Ultrasound': {
				'clear': true,
				'text': "<p>RUQ US: {_ruqus_value}</p>\n<p><br>\n<b><i><a class=\"squiffy-link link-section\" data-section=\"Diagnostic Tests\" role=\"link\" tabindex=\"0\">Return</a></i></b></p>\n<!-- ---------------------------------------------------------------------- -->",
				'attributes': ["_diagnostic_tests+=1","_ruqus","_ruqus_value = Normally distended gallbladder without wall thickening or pericholecystic fluid, many gallstones. Dilated extrahepatic duct system (CBD to 9.6 mm) without dilation of the intrahepatic ductal system."],
			},
			'CT Abdomen': {
				'clear': true,
				'text': "<p>CT Abdomen: {_ctabd_value}</p>\n<p><br>\n<b><i><a class=\"squiffy-link link-section\" data-section=\"Diagnostic Tests\" role=\"link\" tabindex=\"0\">Return</a></i></b></p>\n<!-- ---------------------------------------------------------------------- -->",
				'attributes': ["_diagnostic_tests+=1","_ctabd","_ctabd_value = Cholelithiasis without signs of Pancreatitis. Dilated extrahepatic duct system without intrahepatic ductal system."],
			},
			'MRCP': {
				'clear': true,
				'text': "<p>MRCP: {_mrcp_value}</p>\n<p><br>\n<b><i><a class=\"squiffy-link link-section\" data-section=\"Diagnostic Tests\" role=\"link\" tabindex=\"0\">Return</a></i></b></p>\n<!-- ---------------------------------------------------------------------- -->",
				'attributes': ["_diagnostic_tests+=1","_mrcp","_mrcp_value = Cholelithiasis, extrahepatic ductal system dilated up to 9 mm, with 2 gallstones visualized."],
			},
			'HIDA Scan': {
				'clear': true,
				'text': "<p>HIDA Scan: {_hida_value}</p>\n<p><br>\n<b><i><a class=\"squiffy-link link-section\" data-section=\"Diagnostic Tests\" role=\"link\" tabindex=\"0\">Return</a></i></b></p>\n<!-- ###################################################################### -->",
				'attributes': ["_diagnostic_tests+=1","_hida","_hida_value = The gallbladder and proximal extrahepatic biliary tree are seen within an hour of radiotracer administration, but there is delayed small bowel visualization after 4 hours."],
			},
		},
	},
	'Treatment': {
		'clear': true,
		'text': "<p><b>Treatments</b></p>\n<p><b>I will order an <a class=\"squiffy-link link-passage\" data-passage=\"ERCP\" role=\"link\" tabindex=\"0\">Endoscopic Retrograde Cholangiopancreatography</a></b><br>\n<b>I will order a <a class=\"squiffy-link link-passage\" data-passage=\"PTC\" role=\"link\" tabindex=\"0\">Percutaneous Transhepatic Cholangiography</a></b><br>\n<b>I will perform a <a class=\"squiffy-link link-passage\" data-passage=\"Laparoscopic Cholecystectomy\" role=\"link\" tabindex=\"0\">Laparoscopic Cholecystectomy</a></b><br>\n<b>I will perform an <a class=\"squiffy-link link-passage\" data-passage=\"Open Cholecystectomy\" role=\"link\" tabindex=\"0\">Open Cholecystectomy</a></b><br>\n<b>I will perform an <a class=\"squiffy-link link-passage\" data-passage=\"Open Common Bile Duct Exploration\" role=\"link\" tabindex=\"0\">Open Common Bile Duct Exploration</a></b><br>\n<b>I will perform a <a class=\"squiffy-link link-passage\" data-passage=\"Laparoscopic Common Bile Duct Exploration\" role=\"link\" tabindex=\"0\">Laparoscopic Common Bile Duct Exploration</a></b><br>\n<b>I will perform an <a class=\"squiffy-link link-passage\" data-passage=\"Cholecystectomy and Open Common Bile Duct Exploration\" role=\"link\" tabindex=\"0\">Cholecystectomy and Open Common Bile Duct Exploration</a></b><br>\n<b>I will perform a <a class=\"squiffy-link link-passage\" data-passage=\"Laparoscopic Cholecystectomy and Laparoscopic Common Bile Duct Exploration\" role=\"link\" tabindex=\"0\">Laparoscopic Cholecystectomy and Laparoscopic Common Bile Duct Exploration</a></b><br>\n<b>I will perform a <a class=\"squiffy-link link-passage\" data-passage=\"Common Bile Duct Resection and Roux-en-Y Hepaticojejunostomy\" role=\"link\" tabindex=\"0\">Common Bile Duct Resection and Roux-en-Y Hepaticojejunostomy</a></b><br></p>\n<!-- ---------------------------------------------------------------------- -->",
		'attributes': ["_treatment"],
		'passages': {
			'ERCP': {
				'clear': true,
				'text': "<p><b><i>ERCP is performed but is unable to remove the stones despite repeated attempts.</i></b></p>\n<p>{if not _ptc: <b>I will order a <a class=\"squiffy-link link-passage\" data-passage=\"PTC\" role=\"link\" tabindex=\"0\">Percutaneous Transhepatic Cholangiography</a></b><br> }{else:}\n{if not _lap_chole : <b>I will perform a <a class=\"squiffy-link link-passage\" data-passage=\"Laparoscopic Cholecystectomy\" role=\"link\" tabindex=\"0\">Laparoscopic Cholecystectomy</a></b><br> }{else:}\n{if not _open_chole : <b>I will perform an <a class=\"squiffy-link link-passage\" data-passage=\"Open Cholecystectomy\" role=\"link\" tabindex=\"0\">Open Cholecystectomy</a></b><br> }{else:}\n{if not _open_cbd_exp : <b>I will perform an <a class=\"squiffy-link link-passage\" data-passage=\"Open Common Bile Duct Exploration\" role=\"link\" tabindex=\"0\">Open Common Bile Duct Exploration</a></b><br> }{else:}\n{if not _lap_cbd_exp : <b>I will perform a <a class=\"squiffy-link link-passage\" data-passage=\"Laparoscopic Common Bile Duct Exploration\" role=\"link\" tabindex=\"0\">Laparoscopic Common Bile Duct Exploration</a></b><br> }{else:}\n{if not _open_chole_cbd_exp : <b>I will perform an <a class=\"squiffy-link link-passage\" data-passage=\"Cholecystectomy and Open Common Bile Duct Exploration\" role=\"link\" tabindex=\"0\">Cholecystectomy and Open Common Bile Duct Exploration</a></b><br> }{else:}\n{if not _lap_chole_cbd_exp : <b>I will perform a <a class=\"squiffy-link link-passage\" data-passage=\"Laparoscopic Cholecystectomy and Laparoscopic Common Bile Duct Exploration\" role=\"link\" tabindex=\"0\">Laparoscopic Cholecystectomy and Laparoscopic Common Bile Duct Exploration</a></b><br> }{else:}\n{if not _cbd_resec_roux : <b>I will perform a <a class=\"squiffy-link link-passage\" data-passage=\"Common Bile Duct Resection and Roux-en-Y Hepaticojejunostomy\" role=\"link\" tabindex=\"0\">Common Bile Duct Resection and Roux-en-Y Hepaticojejunostomy</a></b><br> }{else:}</p>\n<!-- ---------------------------------------------------------------------- -->",
				'attributes': ["_ercp"],
			},
			'PTC': {
				'clear': true,
				'text': "<p><b><i>Interventional Radiologists are unavailable at this time.</i></b></p>\n<p>{if not _ercp: <b>I will order an <a class=\"squiffy-link link-passage\" data-passage=\"ERCP\" role=\"link\" tabindex=\"0\">Endoscopic Retrograde Cholangiopancreatography</a></b><br> }{else:}\n{if not _lap_chole : <b>I will perform a <a class=\"squiffy-link link-passage\" data-passage=\"Laparoscopic Cholecystectomy\" role=\"link\" tabindex=\"0\">Laparoscopic Cholecystectomy</a></b><br> }{else:}\n{if not _open_chole : <b>I will perform an <a class=\"squiffy-link link-passage\" data-passage=\"Open Cholecystectomy\" role=\"link\" tabindex=\"0\">Open Cholecystectomy</a></b><br> }{else:}\n{if not _open_cbd_exp : <b>I will perform an <a class=\"squiffy-link link-passage\" data-passage=\"Open Common Bile Duct Exploration\" role=\"link\" tabindex=\"0\">Open Common Bile Duct Exploration</a></b><br> }{else:}\n{if not _lap_cbd_exp : <b>I will perform a <a class=\"squiffy-link link-passage\" data-passage=\"Laparoscopic Common Bile Duct Exploration\" role=\"link\" tabindex=\"0\">Laparoscopic Common Bile Duct Exploration</a></b><br> }{else:}\n{if not _open_chole_cbd_exp : <b>I will perform an <a class=\"squiffy-link link-passage\" data-passage=\"Cholecystectomy and Open Common Bile Duct Exploration\" role=\"link\" tabindex=\"0\">Cholecystectomy and Open Common Bile Duct Exploration</a></b><br> }{else:}\n{if not _lap_chole_cbd_exp : <b>I will perform a <a class=\"squiffy-link link-passage\" data-passage=\"Laparoscopic Cholecystectomy and Laparoscopic Common Bile Duct Exploration\" role=\"link\" tabindex=\"0\">Laparoscopic Cholecystectomy and Laparoscopic Common Bile Duct Exploration</a></b><br> }{else:}\n{if not _cbd_resec_roux : <b>I will perform a <a class=\"squiffy-link link-passage\" data-passage=\"Common Bile Duct Resection and Roux-en-Y Hepaticojejunostomy\" role=\"link\" tabindex=\"0\">Common Bile Duct Resection and Roux-en-Y Hepaticojejunostomy</a></b><br> }{else:}</p>\n<!-- ---------------------------------------------------------------------- -->",
				'attributes': ["_ptc"],
			},
			'Laparoscopic Cholecystectomy': {
				'clear': true,
				'text': "<p><b><i>You successfully perform a laparoscopic cholecystectomy without complication. However postoperative laboratory values show persisistent elevation of LFTs, including a Total Bilirubin of 6.4.</i></b> </p>\n<p>{if not _ercp: <b>I will order an <a class=\"squiffy-link link-passage\" data-passage=\"ERCP\" role=\"link\" tabindex=\"0\">Endoscopic Retrograde Cholangiopancreatography</a></b><br> }{else:}\n{if not _ptc: <b>I will order a <a class=\"squiffy-link link-passage\" data-passage=\"PTC\" role=\"link\" tabindex=\"0\">Percutaneous Transhepatic Cholangiography</a></b><br> }{else:}\n{if not _open_cbd_exp : <b>I will perform an <a class=\"squiffy-link link-passage\" data-passage=\"Open Common Bile Duct Exploration\" role=\"link\" tabindex=\"0\">Open Common Bile Duct Exploration</a></b><br> }{else:}\n{if not _lap_cbd_exp : <b>I will perform a <a class=\"squiffy-link link-passage\" data-passage=\"Laparoscopic Common Bile Duct Exploration\" role=\"link\" tabindex=\"0\">Laparoscopic Common Bile Duct Exploration</a></b><br> }{else:}\n{if not _cbd_resec_roux : <b>I will perform a <a class=\"squiffy-link link-passage\" data-passage=\"Common Bile Duct Resection and Roux-en-Y Hepaticojejunostomy\" role=\"link\" tabindex=\"0\">Common Bile Duct Resection and Roux-en-Y Hepaticojejunostomy</a></b><br> }{else:}</p>\n<!-- ---------------------------------------------------------------------- -->",
				'attributes': ["_chole","_lap_chole"],
			},
			'Open Cholecystectomy': {
				'clear': true,
				'text': "<p><b><i>You successfully perform an open cholecystectomy without complication. The patient complains of pain at the incision site. However postoperative laboratory values show persistent elevation of LFTs, including a Total Bilirubin of 6.4.</i></b></p>\n<p>{if not _ercp: <b>I will order an <a class=\"squiffy-link link-passage\" data-passage=\"ERCP\" role=\"link\" tabindex=\"0\">Endoscopic Retrograde Cholangiopancreatography</a></b><br> }{else:}\n{if not _ptc: <b>I will order a <a class=\"squiffy-link link-passage\" data-passage=\"PTC\" role=\"link\" tabindex=\"0\">Percutaneous Transhepatic Cholangiography</a></b><br> }{else:}\n{if not _open_cbd_exp : <b>I will perform an <a class=\"squiffy-link link-passage\" data-passage=\"Open Common Bile Duct Exploration\" role=\"link\" tabindex=\"0\">Open Common Bile Duct Exploration</a></b><br> }{else:}\n{if not _lap_cbd_exp : <b>I will perform a <a class=\"squiffy-link link-passage\" data-passage=\"Laparoscopic Common Bile Duct Exploration\" role=\"link\" tabindex=\"0\">Laparoscopic Common Bile Duct Exploration</a></b><br> }{else:}\n{if not _cbd_resec_roux : <b>I will perform a <a class=\"squiffy-link link-passage\" data-passage=\"Common Bile Duct Resection and Roux-en-Y Hepaticojejunostomy\" role=\"link\" tabindex=\"0\">Common Bile Duct Resection and Roux-en-Y Hepaticojejunostomy</a></b><br> }{else:}</p>\n<!-- ---------------------------------------------------------------------- -->",
				'attributes': ["_chole","_open_chole"],
			},
			'Cholecystectomy and Open Common Bile Duct Exploration': {
				'clear': true,
				'text': "<p><b><i>You successfully perform an open cholecystectomy and common bile duct exploration and leave a T-tube in place. Three common bile duct stones are removed and intraoperative cholangiogram reveals no further blockage. The patient&#39;s laboratory values downtrend and the patient is discharged home on postoperative day 5.</i><b></p>\n<!-- ---------------------------------------------------------------------- -->",
				'attributes': ["_open_chole_cbd_exp"],
			},
			'Laparoscopic Cholecystectomy and Laparoscopic Common Bile Duct Exploration': {
				'clear': true,
				'text': "<p><b><i>You successfully perform a laparoscopic cholecystectomy and laparoscopic common bile duct exploration with a T-tube left in place. Three common bile duct stones are removed and intraoperative cholangiogram reveals no further blockage. The patient&#39;s laboratory values downtrend and the patient is discharged home on postoperative day 5.</i><b></p>\n<!-- ---------------------------------------------------------------------- -->",
				'attributes': ["_lap_chole_cbd_exp"],
			},
			'Open Common Bile Duct Exploration': {
				'clear': true,
				'text': "<p>{if _chole: \n  <b><i>You perform an open common bile duct exploration. The previous surgeries make it more difficult to identify the biliary tree, however you successfully extract 3 common bile duct stones and intraoperative cholangiogram reveals no filling defects. You leave behind a T-tube. The patient is discharged on postoperative day 7 after tolerating clamping of the T-tube.</i></b> \n}\n{else: \n  <b><i>You successfully perform a common bile duct exploration and leave a T-tube in place. Three common bile duct stones are removed and intraoperative cholangiogram reveals no further blockage. The patient&#39;s laboratory values downtrend and the patient is discharged home on postoperative day 5. However on postoperative day 7 the patient returns with Right Upper Quadrant discomfort. Workup reveals a retained stone. You should have removed the patient&#39;s gallbladder.</i><b> \n}</p>\n<!-- ---------------------------------------------------------------------- -->",
				'attributes': ["_open_cbd_exp"],
			},
			'Laparoscopic Common Bile Duct Exploration': {
				'clear': true,
				'text': "<p>{if _chole: \n  <b><i>You perform a laparoscopic common bile duct exploration with great difficulty since the previous surgeries make it more difficult to identify the biliary tree. However after 5 hours you successfully extract 3 common bile duct stones and intraoperative cholangiogram reveals no filling defects. You leave behind a T-tube. The patient is discharged on postoperative day 4 after tolerating clamping of the T-tube.</i></b> \n}\n{else: \n  <b><i>You successfully perform a laparoscopic common bile duct exploration and leave a T-tube in place. Three common bile duct stones are removed and intraoperative cholangiogram reveals no further blockage. The patient&#39;s laboratory values downtrend and the patient is discharged home on postoperative day 4. However on postoperative day 6 the patient returns with Right Upper Quadrant discomfort. Workup reveals a retained stone. You should have removed the patient&#39;s gallbladder.</i><b> \n}</p>\n<!-- ---------------------------------------------------------------------- -->",
				'attributes': ["_lap_cbd_exp"],
			},
			'Common Bile Duct Resection and Roux-en-Y Hepaticojejunostomy': {
				'clear': true,
				'text': "<p><b><i>The Hepatobilliary surgeon at your institution hears you&#39;ve booked this case and advises you to do something else.</i><b></p>\n<p>{if not _ercp: <b>I will order an <a class=\"squiffy-link link-passage\" data-passage=\"ERCP\" role=\"link\" tabindex=\"0\">Endoscopic Retrograde Cholangiopancreatography</a></b><br> }{else:}\n{if not _ptc: <b>I will order a <a class=\"squiffy-link link-passage\" data-passage=\"PTC\" role=\"link\" tabindex=\"0\">Percutaneous Transhepatic Cholangiography</a></b><br> }{else:}\n{if not _lap_chole : <b>I will perform a <a class=\"squiffy-link link-passage\" data-passage=\"Laparoscopic Cholecystectomy\" role=\"link\" tabindex=\"0\">Laparoscopic Cholecystectomy</a></b><br> }{else:}\n{if not _open_chole : <b>I will perform an <a class=\"squiffy-link link-passage\" data-passage=\"Open Cholecystectomy\" role=\"link\" tabindex=\"0\">Open Cholecystectomy</a></b><br> }{else:}\n{if not _open_cbd_exp : <b>I will perform an <a class=\"squiffy-link link-passage\" data-passage=\"Open Common Bile Duct Exploration\" role=\"link\" tabindex=\"0\">Open Common Bile Duct Exploration</a></b><br> }{else:}\n{if not _lap_cbd_exp : <b>I will perform a <a class=\"squiffy-link link-passage\" data-passage=\"Laparoscopic Common Bile Duct Exploration\" role=\"link\" tabindex=\"0\">Laparoscopic Common Bile Duct Exploration</a></b><br> }{else:}\n{if not _open_cbd_exp : <b>I will perform an <a class=\"squiffy-link link-passage\" data-passage=\"Cholecystectomy and Open Common Bile Duct Exploration\" role=\"link\" tabindex=\"0\">Cholecystectomy and Open Common Bile Duct Exploration</a></b><br> }{else:}\n{if not _lap_cbd_exp : <b>I will perform a <a class=\"squiffy-link link-passage\" data-passage=\"Laparoscopic Cholecystectomy and Laparoscopic Common Bile Duct Exploration\" role=\"link\" tabindex=\"0\">Laparoscopic Cholecystectomy and Laparoscopic Common Bile Duct Exploration</a></b><br> }{else:}\n{if not _cbd_resec_roux : <b>I will perform a <a class=\"squiffy-link link-passage\" data-passage=\"Common Bile Duct Resection and Roux-en-Y Hepaticojejunostomy\" role=\"link\" tabindex=\"0\">Common Bile Duct Resection and Roux-en-Y Hepaticojejunostomy</a></b><br> }{else:}</p>",
				'attributes': ["_cbd_resec_roux"],
			},
		},
	},
}
})();