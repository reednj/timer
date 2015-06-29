
// this is now implemented in mootool.more (finally!)
Element.implement({
   show: function() {this.setStyle('display','');},
   hide: function() {this.setStyle('display','none');}
});

/*
 * JsTemplate: convert template into an element object.
 *
 * example:
 * <!-- this goes in <head>, the browser will ignore it if the type is not text/javascript -->
 * <script id='tmpl-entry' type='text/html'>
 *   <div>
 *     <b>#{title}<b>
 *     <div>#{text}</div>
 *   </div>
 * </script>
 *
 * // replaces #{title} & #{text} with the actual text in the data object, then
 * // inserts the element into <body>
 * new JsTemplate('tmpl-entry').render({title: 'test', text:'test text'}).inject('body');
 *
 * License: MIT-Style License
 * Nathan Reed (c) 2010
 */
var JsTemplate = new Class({
   initialize: function(elem) {
      this.element = $(elem);
      this.regex = /\\?#\{([^{}]+)\}/g; // matches '#{keyword}'
   },

   render: function(data) {
      if($defined(this.element)) {
         // replaces #{name} with whatever is in data.name
         // but first we need to normalize the innerHTML
         var html_string = this.element.innerHTML.clean().trim(); // collapses mulitple whitespace down to single spaces
         var is_td = false;

         if(html_string.test(/^<td/i)) {
            // tables are treated differently. we are not allow to just parse and insert
            // them willy nilly.
            html_string = "<table><tbody><tr>" + html_string + "</tr></tbody></table>";
            is_td = true;
         }

         var e = new Element('div', {'html': html_string.substitute(data, this.regex)});

         if(is_td) {
            return e.getFirst('table').getFirst('tbody').getFirst('tr').getFirst();
         } else {
            return e.getFirst();
         }
      }
   }
});

// @depends mootools-1.2.4-core.js
//
// $e(): Use the mootools new element function to chain up element creation in a nice way
//
// eg. $e('b', 'bold text'); -> <b>bold text</b>
//     $e('a', {'href': 'http://www.google.com', 'text': 'google'}); -> <a href='http://www.google.com'>google</a>
//
// A more complex example using children:
//
//    $e('a', {
//       'href': './home',
//       'children': [
//          $e('img', {'src': './logo.png', 'title': 'popacular'}),
//          $e('span', 'popacular.com/home')
//       ]
//    });
//
// gives:
// <a href='./home'>
//    <img src='./logo.png' title='popacular' />
//    <span>popacular.com/home<span>
//  </a>
//
// Created:  2010-05-21
// License: MIT-Style License
// Nathan Reed (c) 2010
//
$e = function(tag, props) {
   tag = tag || 'div';

   if($type(tag) == 'object' && $undefined(props)) {
      props = tag;
      tag = 'div'
   }

   if(!$defined(props)) {
      return new Element(tag);
   }

   // normalize the properties element for the
   // mootools element constructor
   if($type(props) == 'string') {
      props = {'text': props};
   } else if($type(props) == 'element' || $type(props) == 'array') {
      props = {'children': props};
   }

   // remove the children property from the array, we don't want it in there.
   // because when we pass these properties to the mootools element function it
   // might get confused.
   var children = props.children;
   props.children = null;

   var new_element = new Element(tag, props);

   if($defined(children)) {

      if($type(children) == 'element') {
         // if they have just passed through one child, then
         // normalize it by turning it into an array with one element.
         children = [children];
      }

      // add the children to the new element one by one
      children.each(function(item) {
         new_element.grab(item);
      });

   }

   return new_element
}
