
jade = (function(exports){
/*!
 * Jade - runtime
 * Copyright(c) 2010 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

/**
 * Lame Array.isArray() polyfill for now.
 */

if (!Array.isArray) {
  Array.isArray = function(arr){
    return '[object Array]' == Object.prototype.toString.call(arr);
  };
}

/**
 * Lame Object.keys() polyfill for now.
 */

if (!Object.keys) {
  Object.keys = function(obj){
    var arr = [];
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        arr.push(key);
      }
    }
    return arr;
  }
}

/**
 * Merge two attribute objects giving precedence
 * to values in object `b`. Classes are special-cased
 * allowing for arrays and merging/joining appropriately
 * resulting in a string.
 *
 * @param {Object} a
 * @param {Object} b
 * @return {Object} a
 * @api private
 */

exports.merge = function merge(a, b) {
  var ac = a['class'];
  var bc = b['class'];

  if (ac || bc) {
    ac = ac || [];
    bc = bc || [];
    if (!Array.isArray(ac)) ac = [ac];
    if (!Array.isArray(bc)) bc = [bc];
    ac = ac.filter(nulls);
    bc = bc.filter(nulls);
    a['class'] = ac.concat(bc).join(' ');
  }

  for (var key in b) {
    if (key != 'class') {
      a[key] = b[key];
    }
  }

  return a;
};

/**
 * Filter null `val`s.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function nulls(val) {
  return val != null;
}

/**
 * Render the given attributes object.
 *
 * @param {Object} obj
 * @param {Object} escaped
 * @return {String}
 * @api private
 */

exports.attrs = function attrs(obj, escaped){
  var buf = []
    , terse = obj.terse;

  delete obj.terse;
  var keys = Object.keys(obj)
    , len = keys.length;

  if (len) {
    buf.push('');
    for (var i = 0; i < len; ++i) {
      var key = keys[i]
        , val = obj[key];

      if ('boolean' == typeof val || null == val) {
        if (val) {
          terse
            ? buf.push(key)
            : buf.push(key + '="' + key + '"');
        }
      } else if (0 == key.indexOf('data') && 'string' != typeof val) {
        buf.push(key + "='" + JSON.stringify(val) + "'");
      } else if ('class' == key && Array.isArray(val)) {
        buf.push(key + '="' + exports.escape(val.join(' ')) + '"');
      } else if (escaped && escaped[key]) {
        buf.push(key + '="' + exports.escape(val) + '"');
      } else {
        buf.push(key + '="' + val + '"');
      }
    }
  }

  return buf.join(' ');
};

/**
 * Escape the given string of `html`.
 *
 * @param {String} html
 * @return {String}
 * @api private
 */

exports.escape = function escape(html){
  return String(html)
    .replace(/&(?!(\w+|\#\d+);)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

/**
 * Re-throw the given `err` in context to the
 * the jade in `filename` at the given `lineno`.
 *
 * @param {Error} err
 * @param {String} filename
 * @param {String} lineno
 * @api private
 */

exports.rethrow = function rethrow(err, filename, lineno){
  if (!filename) throw err;

  var context = 3
    , str = require('fs').readFileSync(filename, 'utf8')
    , lines = str.split('\n')
    , start = Math.max(lineno - context, 0)
    , end = Math.min(lines.length, lineno + context);

  // Error context
  var context = lines.slice(start, end).map(function(line, i){
    var curr = i + start + 1;
    return (curr == lineno ? '  > ' : '    ')
      + curr
      + '| '
      + line;
  }).join('\n');

  // Alter exception message
  err.path = filename;
  err.message = (filename || 'Jade') + ':' + lineno
    + '\n' + context + '\n\n' + err.message;
  throw err;
};

  return exports;

})({});

jade.templates = {};
jade.render = function(node, template, data) {
  var tmp = jade.templates[template](data);
  node.innerHTML = tmp;
};

jade.templates["admin_panel_template"] = function(locals, attrs, escape, rethrow, merge) {
attrs = attrs || jade.attrs; escape = escape || jade.escape; rethrow = rethrow || jade.rethrow; merge = merge || jade.merge;
var buf = [];
with (locals || {}) {
var interp;
buf.push('<div class="col-sm-3"><div');
buf.push(attrs({ 'id':(key+'_admin_panel'), "class": ('panel') + ' ' + ('panel-default') }, {"id":true}));
buf.push('><div class="panel-heading"><h3>Worker ' + ((interp = key) == null ? '' : interp) + '</h3></div><div class="list-group condensed">');
// iterate config
;(function(){
  if ('number' == typeof config.length) {
    for (var name = 0, $$l = config.length; name < $$l; name++) {
      var value = config[name];

buf.push('<div class="list-group-item config"><input');
buf.push(attrs({ 'id':(key+'_'+name), 'value':(value), 'type':('text'), "class": ('badge') + ' ' + ('editable') }, {"id":true,"value":true,"type":true}));
buf.push('/>');
var __val__ = name
buf.push(escape(null == __val__ ? "" : __val__));
buf.push('</div>');
    }
  } else {
    for (var name in config) {
      var value = config[name];

buf.push('<div class="list-group-item config"><input');
buf.push(attrs({ 'id':(key+'_'+name), 'value':(value), 'type':('text'), "class": ('badge') + ' ' + ('editable') }, {"id":true,"value":true,"type":true}));
buf.push('/>');
var __val__ = name
buf.push(escape(null == __val__ ? "" : __val__));
buf.push('</div>');
   }
  }
}).call(this);

buf.push('<div class="list-group-item"><button');
buf.push(attrs({ 'id':(key+'_config_submit'), "class": ('btn') + ' ' + ('btn-primary') + ' ' + ('pull-right') }, {"id":true}));
buf.push('>Save</button><button');
buf.push(attrs({ 'id':(key+'_start_stop'), "class": ('btn') + ' ' + ('btn-danger') }, {"id":true}));
buf.push('>');
var __val__ = 'Stop'
buf.push(escape(null == __val__ ? "" : __val__));
buf.push('</button></div></div></div></div>');
}
return buf.join("");
}
jade.templates["event_template"] = function(locals, attrs, escape, rethrow, merge) {
attrs = attrs || jade.attrs; escape = escape || jade.escape; rethrow = rethrow || jade.rethrow; merge = merge || jade.merge;
var buf = [];
with (locals || {}) {
var interp;
buf.push('<div class="list-group-item">(' + ((interp = event.clan.region) == null ? '' : interp) + ')<i>');
var __val__ = ' '+event.name
buf.push(escape(null == __val__ ? "" : __val__));
buf.push('</i>');
if ( ch == 1)
{
buf.push(' joined clan');
}
else
{
buf.push(' left clan');
}
buf.push('<b> [' + escape((interp = event.clan.tag) == null ? '' : interp) + ']</b>');
var __val__ = ' ' + event.clan.name
buf.push(escape(null == __val__ ? "" : __val__));
buf.push('</div>');
}
return buf.join("");
}
jade.templates["request_template"] = function(locals, attrs, escape, rethrow, merge) {
attrs = attrs || jade.attrs; escape = escape || jade.escape; rethrow = rethrow || jade.rethrow; merge = merge || jade.merge;
var buf = [];
with (locals || {}) {
var interp;
buf.push('<div');
buf.push(attrs({ 'id':('queue_task_'+ID), "class": ('list-group-item') + ' ' + ((req.duration?'finished':'active')+(req.error?' list-group-item-danger':'')) }, {"class":true,"id":true}));
buf.push('>');
if ( req.duration)
{
buf.push('<div class="badge">');
var __val__ = req.duration + ' ms'
buf.push(escape(null == __val__ ? "" : __val__));
buf.push('</div>');
}
else
{
buf.push('<div class="badge">');
var __val__ = (new Date()).getTime() - req.start.getTime() + ' ms'
buf.push(escape(null == __val__ ? "" : __val__));
buf.push('</div>');
}
buf.push('<b>');
var __val__ = '#'+ID
buf.push(escape(null == __val__ ? "" : __val__));
buf.push('</b>');
var __val__ = ' (' + req.task.region + req.task.skip + ')'
buf.push(escape(null == __val__ ? "" : __val__));
buf.push('<i>');
var __val__ = req.error?(' - ' + req.error):(' - ' + req.count + ' clans')
buf.push(escape(null == __val__ ? "" : __val__));
buf.push('</i>');
minutes = req.start.getMinutes().toString();
seconds = req.start.getSeconds().toString();
minutesString = '00'.slice(0,minutes.length-2)+minutes;
secondsString = '00'.slice(0,seconds.length-2)+seconds;
buf.push('<small>');
var __val__ = ' (Start:&nbsp;' + req.start.getHours() + ':' + minutesString + ':' + secondsString +')'
buf.push(escape(null == __val__ ? "" : __val__));
buf.push('</small></div>');
}
return buf.join("");
}
jade.templates["worker_admin_template"] = function(locals, attrs, escape, rethrow, merge) {
attrs = attrs || jade.attrs; escape = escape || jade.escape; rethrow = rethrow || jade.rethrow; merge = merge || jade.merge;
var buf = [];
with (locals || {}) {
var interp;
// iterate config
;(function(){
  if ('number' == typeof config.length) {
    for (var name = 0, $$l = config.length; name < $$l; name++) {
      var value = config[name];

if ( name != 'paused')
{
buf.push('<input');
buf.push(attrs({ 'id':(type+'_'+name), 'value':(value), 'type':('text'), 'title':(name), "class": ('badge') + ' ' + ('editable') }, {"id":true,"value":true,"type":true,"title":true}));
buf.push('/>');
}
    }
  } else {
    for (var name in config) {
      var value = config[name];

if ( name != 'paused')
{
buf.push('<input');
buf.push(attrs({ 'id':(type+'_'+name), 'value':(value), 'type':('text'), 'title':(name), "class": ('badge') + ' ' + ('editable') }, {"id":true,"value":true,"type":true,"title":true}));
buf.push('/>');
}
   }
  }
}).call(this);

buf.push('<button');
buf.push(attrs({ 'id':(type+'_config_submit'), "class": ('btn') + ' ' + ('btn-xs') + ' ' + ('btn-primary') + ' ' + ('pull-right') }, {"id":true}));
buf.push('>Save</button><button');
buf.push(attrs({ 'id':(type+'_start_stop'), "class": ('btn') + ' ' + ('btn-xs') + ' ' + ('btn-danger') + ' ' + (config.paused ? 'paused':'') }, {"class":true,"id":true}));
buf.push('>');
var __val__ = config.paused ? 'Start' : 'Stop'
buf.push(escape(null == __val__ ? "" : __val__));
buf.push('</button>');
}
return buf.join("");
}