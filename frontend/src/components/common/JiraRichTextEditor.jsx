import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle, Color } from '@tiptap/extension-text-style';

import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  Link as LinkIcon,
  Smile,
  Undo,
  Redo,
  ChevronDown,
  Type,
  Quote,
  Minus,
  Highlighter,
  Check,
  X,
  ExternalLink,
  Trash2,
} from 'lucide-react';

export const JiraRichTextEditor = ({
  value = '',
  onChange,
  placeholder = 'Add a description or context... Type / for shortcuts',
  minHeight = '140px',
  maxHeight = '300px',
  readOnly = false,
}) => {
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);
  const [showListMenu, setShowListMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [showEmojiMenu, setShowEmojiMenu] = useState(false);

  // Link Modal State
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        bulletList: {
          HTMLAttributes: {
            class: 'jira-bullet-list',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'jira-ordered-list',
          },
        },
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'jira-editor-link',
          style: 'color: #0052CC; text-decoration: underline; cursor: pointer;',
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value || '',
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      if (onChange) {
        onChange(html === '<p></p>' ? '' : html);
      }
    },
  });

  // Sync external value updates
  useEffect(() => {
    if (editor && value !== undefined) {
      const currentHtml = editor.getHTML();
      if (value !== currentHtml && (value !== '' || currentHtml !== '<p></p>')) {
        editor.commands.setContent(value || '');
      }
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  const openLinkModal = () => {
    const previousUrl = editor.getAttributes('link').href || '';
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ') || '';

    setLinkUrl(previousUrl);
    setLinkText(selectedText);
    setIsLinkModalOpen(true);
    setShowHeadingMenu(false);
    setShowListMenu(false);
    setShowHighlightMenu(false);
    setShowEmojiMenu(false);
  };

  const handleSaveLink = (e) => {
    e?.preventDefault();
    if (!linkUrl.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      setIsLinkModalOpen(false);
      return;
    }

    const formattedUrl = linkUrl.trim().startsWith('http://') || linkUrl.trim().startsWith('https://')
      ? linkUrl.trim()
      : `https://${linkUrl.trim()}`;

    if (linkText.trim() && !editor.state.selection.empty) {
      editor.chain().focus().insertContent(linkText.trim()).extendMarkRange('link').setLink({ href: formattedUrl }).run();
    } else if (linkText.trim() && editor.state.selection.empty) {
      editor.chain().focus().insertContent(`<a href="${formattedUrl}">${linkText.trim()}</a>`).run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: formattedUrl }).run();
    }

    setIsLinkModalOpen(false);
  };

  const handleRemoveLink = () => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    setIsLinkModalOpen(false);
  };

  const insertEmoji = (emoji) => {
    editor.chain().focus().insertContent(emoji).run();
    setShowEmojiMenu(false);
  };

  return (
    <div
      style={{
        border: editor.isFocused ? '2px solid #4C9AFF' : '1px solid #DFE1E6',
        borderRadius: '6px',
        backgroundColor: '#FFFFFF',
        transition: 'border-color 0.15s ease',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {/* 1. JIRA RICH TEXT TOOLBAR (TipTap Connected) */}
      {!readOnly && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            padding: '6px 8px',
            borderBottom: '1px solid #EBECF0',
            backgroundColor: '#FAFBFC',
            borderRadius: '5px 5px 0 0',
            flexWrap: 'wrap',
            userSelect: 'none',
          }}
          onMouseDown={(e) => {
            // Prevent losing editor selection when clicking toolbar buttons
            if (!isLinkModalOpen) e.preventDefault();
          }}
        >
          {/* Text Style / Headings Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => {
                setShowHeadingMenu(!showHeadingMenu);
                setShowListMenu(false);
                setShowHighlightMenu(false);
                setShowEmojiMenu(false);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: showHeadingMenu || editor.isActive('heading') ? '#EBECF0' : 'transparent',
                color: '#42526E',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              title="Text Style"
            >
              <Type size={14} />
              <ChevronDown size={12} />
            </button>

            {showHeadingMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '4px',
                  width: '160px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '6px',
                  border: '1px solid #DFE1E6',
                  boxShadow: '0 4px 14px rgba(9, 30, 66, 0.15)',
                  zIndex: 100,
                  padding: '4px',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().setParagraph().run();
                    setShowHeadingMenu(false);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '6px 10px',
                    border: 'none',
                    backgroundColor: editor.isActive('paragraph') ? '#DEEBFF' : 'transparent',
                    color: editor.isActive('paragraph') ? '#0052CC' : '#172B4D',
                    fontSize: '13px',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>Normal text</span>
                  {editor.isActive('paragraph') && <Check size={14} color="#0052CC" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().toggleHeading({ level: 1 }).run();
                    setShowHeadingMenu(false);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '6px 10px',
                    border: 'none',
                    backgroundColor: editor.isActive('heading', { level: 1 }) ? '#DEEBFF' : 'transparent',
                    color: editor.isActive('heading', { level: 1 }) ? '#0052CC' : '#172B4D',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>Heading 1</span>
                  {editor.isActive('heading', { level: 1 }) && <Check size={14} color="#0052CC" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().toggleHeading({ level: 2 }).run();
                    setShowHeadingMenu(false);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '6px 10px',
                    border: 'none',
                    backgroundColor: editor.isActive('heading', { level: 2 }) ? '#DEEBFF' : 'transparent',
                    color: editor.isActive('heading', { level: 2 }) ? '#0052CC' : '#172B4D',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>Heading 2</span>
                  {editor.isActive('heading', { level: 2 }) && <Check size={14} color="#0052CC" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().toggleHeading({ level: 3 }).run();
                    setShowHeadingMenu(false);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '6px 10px',
                    border: 'none',
                    backgroundColor: editor.isActive('heading', { level: 3 }) ? '#DEEBFF' : 'transparent',
                    color: editor.isActive('heading', { level: 3 }) ? '#0052CC' : '#172B4D',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>Heading 3</span>
                  {editor.isActive('heading', { level: 3 }) && <Check size={14} color="#0052CC" />}
                </button>
              </div>
            )}
          </div>

          <div style={{ width: '1px', height: '18px', backgroundColor: '#DFE1E6', margin: '0 4px' }} />

          {/* Bold */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            style={{
              padding: '5px 7px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: editor.isActive('bold') ? '#DEEBFF' : 'transparent',
              color: editor.isActive('bold') ? '#0052CC' : '#42526E',
              cursor: 'pointer',
            }}
            title="Bold (Ctrl+B)"
          >
            <Bold size={14} />
          </button>

          {/* Italic */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            style={{
              padding: '5px 7px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: editor.isActive('italic') ? '#DEEBFF' : 'transparent',
              color: editor.isActive('italic') ? '#0052CC' : '#42526E',
              cursor: 'pointer',
            }}
            title="Italic (Ctrl+I)"
          >
            <Italic size={14} />
          </button>

          {/* Underline */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            style={{
              padding: '5px 7px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: editor.isActive('underline') ? '#DEEBFF' : 'transparent',
              color: editor.isActive('underline') ? '#0052CC' : '#42526E',
              cursor: 'pointer',
            }}
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon size={14} />
          </button>

          {/* Strikethrough */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            style={{
              padding: '5px 7px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: editor.isActive('strike') ? '#DEEBFF' : 'transparent',
              color: editor.isActive('strike') ? '#0052CC' : '#42526E',
              cursor: 'pointer',
            }}
            title="Strikethrough"
          >
            <Strikethrough size={14} />
          </button>

          <div style={{ width: '1px', height: '18px', backgroundColor: '#DFE1E6', margin: '0 4px' }} />

          {/* Lists Dropdown (Bullet, Numbered, Task list) */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => {
                setShowListMenu(!showListMenu);
                setShowHeadingMenu(false);
                setShowHighlightMenu(false);
                setShowEmojiMenu(false);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor:
                  showListMenu ||
                  editor.isActive('bulletList') ||
                  editor.isActive('orderedList') ||
                  editor.isActive('taskList')
                    ? '#DEEBFF'
                    : 'transparent',
                color:
                  editor.isActive('bulletList') ||
                  editor.isActive('orderedList') ||
                  editor.isActive('taskList')
                    ? '#0052CC'
                    : '#42526E',
                fontSize: '13px',
                cursor: 'pointer',
              }}
              title="List formats"
            >
              <List size={14} />
              <ChevronDown size={12} />
            </button>

            {showListMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '4px',
                  width: '230px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '6px',
                  border: '1px solid #DFE1E6',
                  boxShadow: '0 4px 14px rgba(9, 30, 66, 0.15)',
                  zIndex: 100,
                  padding: '6px',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().toggleBulletList().run();
                    setShowListMenu(false);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    border: 'none',
                    backgroundColor: editor.isActive('bulletList') ? '#DEEBFF' : 'transparent',
                    color: editor.isActive('bulletList') ? '#0052CC' : '#172B4D',
                    fontSize: '13px',
                    cursor: 'pointer',
                    borderRadius: '4px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <List size={14} color="#5E6C84" />
                    <span>Bulleted list</span>
                  </div>
                  <kbd style={{ fontSize: '10px', color: '#7A869A', backgroundColor: '#EBECF0', padding: '1px 5px', borderRadius: '3px' }}>
                    Ctrl+Shift+8
                  </kbd>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().toggleOrderedList().run();
                    setShowListMenu(false);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    border: 'none',
                    backgroundColor: editor.isActive('orderedList') ? '#DEEBFF' : 'transparent',
                    color: editor.isActive('orderedList') ? '#0052CC' : '#172B4D',
                    fontSize: '13px',
                    cursor: 'pointer',
                    borderRadius: '4px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ListOrdered size={14} color="#5E6C84" />
                    <span>Numbered list</span>
                  </div>
                  <kbd style={{ fontSize: '10px', color: '#7A869A', backgroundColor: '#EBECF0', padding: '1px 5px', borderRadius: '3px' }}>
                    Ctrl+Shift+7
                  </kbd>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().toggleTaskList().run();
                    setShowListMenu(false);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    border: 'none',
                    backgroundColor: editor.isActive('taskList') ? '#DEEBFF' : 'transparent',
                    color: editor.isActive('taskList') ? '#0052CC' : '#172B4D',
                    fontSize: '13px',
                    cursor: 'pointer',
                    borderRadius: '4px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckSquare size={14} color="#5E6C84" />
                    <span>Task list</span>
                  </div>
                  <kbd style={{ fontSize: '10px', color: '#7A869A', backgroundColor: '#EBECF0', padding: '1px 5px', borderRadius: '3px' }}>
                    Ctrl+Shift+6
                  </kbd>
                </button>
              </div>
            )}
          </div>

          {/* Highlight Picker */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => {
                setShowHighlightMenu(!showHighlightMenu);
                setShowHeadingMenu(false);
                setShowListMenu(false);
                setShowEmojiMenu(false);
              }}
              style={{
                padding: '5px 7px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: editor.isActive('highlight') ? '#FFF0B3' : 'transparent',
                color: '#42526E',
                cursor: 'pointer',
              }}
              title="Highlight color"
            >
              <Highlighter size={14} />
            </button>

            {showHighlightMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '4px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '6px',
                  border: '1px solid #DFE1E6',
                  boxShadow: '0 4px 14px rgba(9, 30, 66, 0.15)',
                  zIndex: 100,
                  padding: '6px',
                  display: 'flex',
                  gap: '6px',
                }}
              >
                {[
                  { color: '#FFE380', label: 'Yellow' },
                  { color: '#79F2C0', label: 'Green' },
                  { color: '#B3D4FF', label: 'Blue' },
                  { color: '#FFBDAD', label: 'Red' },
                  { color: '#EAE6FF', label: 'Purple' },
                ].map((h) => (
                  <button
                    key={h.color}
                    type="button"
                    onClick={() => {
                      editor.chain().focus().toggleHighlight({ color: h.color }).run();
                      setShowHighlightMenu(false);
                    }}
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      backgroundColor: h.color,
                      border: '1px solid #DFE1E6',
                      cursor: 'pointer',
                    }}
                    title={h.label}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Text Color Picker */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => {
                setShowColorMenu(!showColorMenu);
                setShowHighlightMenu(false);
                setShowHeadingMenu(false);
                setShowListMenu(false);
                setShowEmojiMenu(false);
              }}
              style={{
                display: 'inline-flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px 6px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: showColorMenu ? '#EBECF0' : 'transparent',
                color: '#42526E',
                cursor: 'pointer',
                height: '26px',
              }}
              title="Text color"
            >
              <span style={{ fontSize: '13px', fontWeight: 800, lineHeight: 1 }}>A</span>
              <span
                style={{
                  width: '12px',
                  height: '3px',
                  backgroundColor: editor.getAttributes('textStyle').color || '#0052CC',
                  borderRadius: '1px',
                  marginTop: '1px',
                }}
              />
            </button>

            {showColorMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '4px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '6px',
                  border: '1px solid #DFE1E6',
                  boxShadow: '0 4px 16px rgba(9, 30, 66, 0.18)',
                  zIndex: 100,
                  padding: '8px',
                  width: '170px',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#5E6C84', marginBottom: '6px' }}>
                  TEXT COLOR
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', marginBottom: '8px' }}>
                  {[
                    { color: '#172B4D', label: 'Default Charcoal' },
                    { color: '#5E6C84', label: 'Slate Grey' },
                    { color: '#0052CC', label: 'Jira Blue' },
                    { color: '#00B8D9', label: 'Teal' },
                    { color: '#00875A', label: 'Green' },
                    { color: '#FF8B00', label: 'Amber' },
                    { color: '#DE350B', label: 'Red' },
                    { color: '#5243AA', label: 'Purple' },
                    { color: '#E05297', label: 'Magenta' },
                    { color: '#6554C0', label: 'Violet' },
                  ].map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => {
                        editor.chain().focus().setColor(c.color).run();
                        setShowColorMenu(false);
                      }}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        backgroundColor: c.color,
                        border: editor.getAttributes('textStyle').color === c.color ? '2px solid #0052CC' : '1px solid rgba(0,0,0,0.15)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title={c.label}
                    >
                      {editor.getAttributes('textStyle').color === c.color && <Check size={12} color="#FFFFFF" />}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().unsetColor().run();
                    setShowColorMenu(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '4px 6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#5E6C84',
                    border: '1px solid #DFE1E6',
                    borderRadius: '4px',
                    backgroundColor: '#FAFBFC',
                    cursor: 'pointer',
                  }}
                >
                  Reset to default color
                </button>
              </div>
            )}
          </div>

          <div style={{ width: '1px', height: '18px', backgroundColor: '#DFE1E6', margin: '0 4px' }} />

          {/* Inline Code */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCode().run()}
            style={{
              padding: '5px 7px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: editor.isActive('code') ? '#DEEBFF' : 'transparent',
              color: editor.isActive('code') ? '#0052CC' : '#42526E',
              cursor: 'pointer',
            }}
            title="Inline code"
          >
            <Code size={14} />
          </button>

          {/* Blockquote */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            style={{
              padding: '5px 7px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: editor.isActive('blockquote') ? '#DEEBFF' : 'transparent',
              color: editor.isActive('blockquote') ? '#0052CC' : '#42526E',
              cursor: 'pointer',
            }}
            title="Quote"
          >
            <Quote size={14} />
          </button>

          {/* Horizontal Rule */}
          <button
            type="button"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            style={{
              padding: '5px 7px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: 'transparent',
              color: '#42526E',
              cursor: 'pointer',
            }}
            title="Horizontal divider"
          >
            <Minus size={14} />
          </button>

          {/* Link Trigger */}
          <button
            type="button"
            onClick={openLinkModal}
            style={{
              padding: '5px 7px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: editor.isActive('link') ? '#DEEBFF' : 'transparent',
              color: editor.isActive('link') ? '#0052CC' : '#42526E',
              cursor: 'pointer',
            }}
            title="Insert or Edit link"
          >
            <LinkIcon size={14} />
          </button>

          {/* Emoji Trigger */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => {
                setShowEmojiMenu(!showEmojiMenu);
                setShowHeadingMenu(false);
                setShowListMenu(false);
                setShowHighlightMenu(false);
              }}
              style={{
                padding: '5px 7px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: 'transparent',
                color: '#42526E',
                cursor: 'pointer',
              }}
              title="Emoji"
            >
              <Smile size={14} />
            </button>

            {showEmojiMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '4px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '6px',
                  border: '1px solid #DFE1E6',
                  boxShadow: '0 4px 14px rgba(9, 30, 66, 0.15)',
                  zIndex: 100,
                  padding: '8px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: '4px',
                }}
              >
                {['👍', '🔥', '🚀', '✅', '⚠️', '🎯', '🐛', '💡', '🎉', '👏'].map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => insertEmoji(em)}
                    style={{
                      fontSize: '16px',
                      padding: '4px',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      borderRadius: '4px',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F4F5F7')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {em}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ flex: 1 }} />

          {/* Undo / Redo */}
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            style={{
              padding: '5px 7px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: 'transparent',
              color: editor.can().undo() ? '#42526E' : '#C1C7D0',
              cursor: editor.can().undo() ? 'pointer' : 'not-allowed',
            }}
            title="Undo"
          >
            <Undo size={14} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            style={{
              padding: '5px 7px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: 'transparent',
              color: editor.can().redo() ? '#42526E' : '#C1C7D0',
              cursor: editor.can().redo() ? 'pointer' : 'not-allowed',
            }}
            title="Redo"
          >
            <Redo size={14} />
          </button>
        </div>
      )}

      {/* 2. JIRA INLINE LINK MODAL / POPOVER */}
      {isLinkModalOpen && (
        <div
          style={{
            position: 'absolute',
            top: '46px',
            left: '12px',
            zIndex: 150,
            width: '320px',
            backgroundColor: '#FFFFFF',
            borderRadius: '6px',
            border: '1px solid #DFE1E6',
            boxShadow: '0 8px 24px rgba(9, 30, 66, 0.18)',
            padding: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#172B4D' }}>
              {editor.isActive('link') ? 'Edit Link' : 'Insert Link'}
            </span>
            <button
              type="button"
              onClick={() => setIsLinkModalOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <X size={15} color="#5E6C84" />
            </button>
          </div>

          <form onSubmit={handleSaveLink} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#5E6C84', marginBottom: '4px' }}>
                WEB ADDRESS (URL)
              </label>
              <input
                autoFocus
                type="text"
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="jira-input"
                style={{ fontSize: '13px', padding: '6px 10px', height: '32px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#5E6C84', marginBottom: '4px' }}>
                TEXT TO DISPLAY
              </label>
              <input
                type="text"
                placeholder="Link text..."
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                className="jira-input"
                style={{ fontSize: '13px', padding: '6px 10px', height: '32px' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
              {editor.isActive('link') ? (
                <button
                  type="button"
                  onClick={handleRemoveLink}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'none',
                    border: 'none',
                    color: '#DE350B',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  <Trash2 size={13} />
                  <span>Unlink</span>
                </button>
              ) : (
                <div />
              )}

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsLinkModalOpen(false)}
                  className="jira-btn jira-btn-ghost"
                  style={{ padding: '4px 10px', fontSize: '12px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="jira-btn jira-btn-primary"
                  style={{ padding: '4px 14px', fontSize: '12px' }}
                >
                  Save
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* 3. TIPTAP EDITOR CONTENT WRAPPER */}
      <div
        style={{
          minHeight,
          maxHeight,
          padding: '12px 14px',
          outline: 'none',
          fontSize: '13.5px',
          lineHeight: '1.6',
          color: '#172B4D',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          overflowY: 'auto',
          backgroundColor: '#FFFFFF',
          borderRadius: '0 0 5px 5px',
        }}
      >
        <EditorContent editor={editor} />
      </div>

      {/* CSS Styles for TipTap render & Bullet/Number list enforcement */}
      <style>{`
        .tiptap {
          outline: none;
          min-height: ${minHeight};
        }
        .tiptap p {
          margin: 0 0 8px 0;
        }
        .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #7A869A;
          pointer-events: none;
          height: 0;
        }
        .tiptap h1 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #172B4D;
          margin: 12px 0 6px 0;
        }
        .tiptap h2 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #172B4D;
          margin: 10px 0 6px 0;
        }
        .tiptap h3 {
          font-size: 1.1rem;
          font-weight: 700;
          color: #172B4D;
          margin: 8px 0 4px 0;
        }

        /* Bullet List Explicit Styling */
        .tiptap ul:not([data-type="taskList"]) {
          list-style-type: disc !important;
          padding-left: 26px !important;
          margin: 8px 0 !important;
        }
        .tiptap ul:not([data-type="taskList"]) li {
          list-style-type: disc !important;
          display: list-item !important;
          margin: 4px 0 !important;
        }

        /* Ordered / Numbered List Explicit Styling */
        .tiptap ol {
          list-style-type: decimal !important;
          padding-left: 26px !important;
          margin: 8px 0 !important;
        }
        .tiptap ol li {
          list-style-type: decimal !important;
          display: list-item !important;
          margin: 4px 0 !important;
        }

        /* Task List Styling */
        .tiptap ul[data-type="taskList"] {
          list-style: none !important;
          padding: 0 !important;
          margin: 6px 0 !important;
        }
        .tiptap ul[data-type="taskList"] li {
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
          margin: 4px 0 !important;
          list-style: none !important;
        }
        .tiptap ul[data-type="taskList"] li > label {
          margin: 0 !important;
          display: flex !important;
          align-items: center !important;
          user-select: none;
        }
        .tiptap ul[data-type="taskList"] li > label input[type="checkbox"] {
          cursor: pointer;
          width: 15px;
          height: 15px;
          accent-color: #0052CC;
          margin: 0;
        }

        .tiptap blockquote {
          border-left: 3px solid #0052CC;
          padding-left: 12px;
          color: #5E6C84;
          margin: 8px 0;
          font-style: italic;
        }
        .tiptap code {
          background-color: #F4F5F7;
          color: #172B4D;
          padding: 2px 5px;
          border-radius: 3px;
          font-family: monospace;
          font-size: 12px;
        }
        .tiptap pre {
          background: #1D2125;
          color: #F4F5F7;
          font-family: monospace;
          padding: 10px 14px;
          border-radius: 6px;
          margin: 8px 0;
        }
        .tiptap pre code {
          color: inherit;
          padding: 0;
          background: none;
          font-size: 12.5px;
        }
        .tiptap hr {
          border: none;
          border-top: 1px solid #DFE1E6;
          margin: 14px 0;
        }
      `}</style>
    </div>
  );
};
