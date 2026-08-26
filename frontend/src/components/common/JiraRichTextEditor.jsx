import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { Node, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle, Color } from '@tiptap/extension-text-style';
import Image from '@tiptap/extension-image';
import client from '../../api/client';

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
  Trash2,
  Image as ImageIcon,
  Film,
  UploadCloud,
  Loader2,
  AlignCenter,
  AlignLeft,
  AlignRight,
} from 'lucide-react';

// Custom TipTap Video Node Extension with Small Fixed 240px & Alignment
const VideoNode = Node.create({
  name: 'video',
  group: 'block',
  selectable: true,
  draggable: true,
  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => element.getAttribute('src') || element.querySelector('source')?.getAttribute('src'),
      },
      type: {
        default: 'video/mp4',
        parseHTML: (element) => element.querySelector('source')?.getAttribute('type') || 'video/mp4',
      },
      controls: {
        default: true,
      },
      alignment: {
        default: 'left',
        parseHTML: (element) => element.getAttribute('data-align') || element.closest('.jira-video-wrapper')?.getAttribute('data-align') || 'left',
        renderHTML: (attributes) => ({
          'data-align': attributes.alignment || 'left',
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div.jira-video-wrapper',
      },
      {
        tag: 'video',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const alignVal = HTMLAttributes.alignment || 'left';
    const margin = alignVal === 'center' ? '8px auto' : alignVal === 'right' ? '8px 0 8px auto' : '8px auto 8px 0';

    return [
      'div',
      {
        class: 'jira-video-wrapper',
        'data-align': alignVal,
        style: `margin: ${margin}; width: 240px; max-width: 100%; border-radius: 8px; overflow: hidden; border: 1px solid #DFE1E6; box-shadow: 0 2px 8px rgba(9, 30, 66, 0.08); background: #000; display: block;`,
      },
      [
        'video',
        mergeAttributes(HTMLAttributes, {
          controls: 'true',
          preload: 'metadata',
          style: 'width: 100%; max-height: 160px; display: block; object-fit: contain; background: #000; border-radius: 6px;',
        }),
        ['source', { src: HTMLAttributes.src, type: HTMLAttributes.type || 'video/mp4' }],
      ],
    ];
  },
});

// Custom Resizable Image Extension
const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: '25%',
        parseHTML: (element) => element.getAttribute('width') || element.style.width || '25%',
        renderHTML: (attributes) => {
          return {
            width: attributes.width,
            style: `width: ${attributes.width}; max-width: 100%; border-radius: 6px; border: 1px solid #DFE1E6; margin: 8px 0; display: block;`,
          };
        },
      },
      alignment: {
        default: 'left',
        parseHTML: (element) => element.getAttribute('data-align') || 'left',
        renderHTML: (attributes) => {
          const margin = attributes.alignment === 'center'
            ? 'margin: 8px auto;'
            : attributes.alignment === 'right'
            ? 'margin: 8px 0 8px auto;'
            : 'margin: 8px auto 8px 0;';
          return {
            'data-align': attributes.alignment,
            style: `width: ${attributes.width || '25%'}; max-width: 100%; border-radius: 6px; border: 1px solid #DFE1E6; ${margin} display: block;`,
          };
        },
      },
    };
  },
});

export const JiraRichTextEditor = ({
  value = '',
  onChange,
  placeholder = 'Add a description or context... Paste images or type / for shortcuts',
  minHeight = '140px',
  maxHeight = '300px',
  readOnly = false,
}) => {
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);
  const [showListMenu, setShowListMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [showEmojiMenu, setShowEmojiMenu] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);

  // Selected Image or Video controls
  const [selectedMediaNode, setSelectedMediaNode] = useState(null);

  // Uploading state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const fileInputRef = useRef(null);

  // Link Modal State
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');

  // Delete media file from server disk
  const deleteMediaFileFromServer = async (srcUrl) => {
    if (!srcUrl) return;
    try {
      const parts = srcUrl.split('/');
      const filename = parts[parts.length - 1];
      if (filename && filename.startsWith('media_')) {
        await client.delete(`/api/media/${filename}`);
      }
    } catch (err) {
      console.warn('Notice removing media file:', err);
    }
  };

  // Handle uploading media file to Backend API
  const handleUploadFile = async (file) => {
    if (!file) return;
    try {
      setIsUploading(true);
      setUploadProgressText(`Uploading ${file.name}...`);

      const formData = new FormData();
      formData.append('file', file);

      const res = await client.post('/api/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { url, file_name, media_type, file_type } = res.data;
      const mediaSrc = url;

      if (media_type === 'video' || file.type.startsWith('video/')) {
        const mime = file_type || 'video/mp4';
        editor
          ?.chain()
          .focus()
          .insertContent({
            type: 'video',
            attrs: {
              src: mediaSrc,
              type: mime,
              alignment: 'left',
            },
          })
          .run();
      } else {
        editor?.chain().focus().setImage({ src: mediaSrc, alt: file_name, width: '25%' }).run();
      }

      setShowMediaModal(false);
      setMediaUrlInput('');
    } catch (err) {
      console.error('Failed to upload media:', err);
      alert('Media upload failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsUploading(false);
      setUploadProgressText('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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
      CustomImage.configure({
        inline: false,
        allowBase64: true,
      }),
      VideoNode,
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
    onSelectionUpdate: ({ editor }) => {
      if (editor.isActive('image')) {
        const attrs = editor.getAttributes('image');
        setSelectedMediaNode({ type: 'image', ...attrs });
      } else if (editor.isActive('video')) {
        const attrs = editor.getAttributes('video');
        setSelectedMediaNode({ type: 'video', ...attrs });
      } else {
        setSelectedMediaNode(null);
      }
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      if (onChange) {
        onChange(html === '<p></p>' ? '' : html);
      }
    },
    editorProps: {
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.type.indexOf('image') !== -1 || item.type.indexOf('video') !== -1) {
            const file = item.getAsFile();
            if (file) {
              event.preventDefault();
              handleUploadFile(file);
              return true;
            }
          }
        }
        return false;
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
          const file = files[0];
          if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
            event.preventDefault();
            handleUploadFile(file);
            return true;
          }
        }
        return false;
      },
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
    setShowColorMenu(false);
    setShowEmojiMenu(false);
    setShowMediaModal(false);
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

  const insertMediaFromUrl = (e) => {
    e?.preventDefault();
    if (!mediaUrlInput.trim()) return;

    const url = mediaUrlInput.trim();
    const isVideo = url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.mov');

    if (isVideo) {
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'video',
          attrs: {
            src: url,
            type: 'video/mp4',
            alignment: 'left',
          },
        })
        .run();
    } else {
      editor.chain().focus().setImage({ src: url, width: '25%' }).run();
    }

    setShowMediaModal(false);
    setMediaUrlInput('');
  };

  // Image size change handler
  const setImageWidth = (widthStr) => {
    editor.chain().focus().updateAttributes('image', { width: widthStr }).run();
    setSelectedMediaNode((prev) => (prev ? { ...prev, width: widthStr } : null));
  };

  // Alignment handler for image and video
  const setMediaAlignment = (alignStr) => {
    if (selectedMediaNode?.type === 'video') {
      editor.chain().focus().updateAttributes('video', { alignment: alignStr }).run();
    } else {
      editor.chain().focus().updateAttributes('image', { alignment: alignStr }).run();
    }
    setSelectedMediaNode((prev) => (prev ? { ...prev, alignment: alignStr } : null));
  };

  const handleRemoveSelectedMedia = () => {
    if (selectedMediaNode?.src) {
      deleteMediaFileFromServer(selectedMediaNode.src);
    }
    editor.chain().focus().deleteSelection().run();
    setSelectedMediaNode(null);
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
      {/* Hidden File Input for Image/Video upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleUploadFile(e.target.files[0]);
          }
        }}
      />

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
            if (!isLinkModalOpen && !showMediaModal) e.preventDefault();
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
                setShowColorMenu(false);
                setShowEmojiMenu(false);
                setShowMediaModal(false);
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
                setShowColorMenu(false);
                setShowEmojiMenu(false);
                setShowMediaModal(false);
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
                setShowColorMenu(false);
                setShowEmojiMenu(false);
                setShowMediaModal(false);
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
                setShowMediaModal(false);
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

          {/* Media (Image / Video) Upload Button */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => {
                setShowMediaModal(!showMediaModal);
                setShowHeadingMenu(false);
                setShowListMenu(false);
                setShowHighlightMenu(false);
                setShowColorMenu(false);
                setShowEmojiMenu(false);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 7px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: showMediaModal ? '#DEEBFF' : 'transparent',
                color: showMediaModal ? '#0052CC' : '#42526E',
                cursor: 'pointer',
              }}
              title="Insert image or video recording"
            >
              <ImageIcon size={14} />
              <ChevronDown size={11} />
            </button>

            {showMediaModal && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '4px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '6px',
                  border: '1px solid #DFE1E6',
                  boxShadow: '0 6px 20px rgba(9, 30, 66, 0.18)',
                  zIndex: 120,
                  padding: '14px',
                  width: '280px',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#172B4D', marginBottom: '10px' }}>
                  Add Image or Video
                </div>

                {/* Upload from Local Computer */}
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px dashed #0052CC',
                    backgroundColor: '#DEEBFF33',
                    color: '#0052CC',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: isUploading ? 'not-allowed' : 'pointer',
                    marginBottom: '12px',
                  }}
                >
                  {isUploading ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={15} />}
                  <span>{isUploading ? uploadProgressText : 'Upload Image / Video Recording'}</span>
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '8px 0' }}>
                  <div style={{ flex: 1, height: '1px', backgroundColor: '#DFE1E6' }} />
                  <span style={{ fontSize: '11px', color: '#7A869A', fontWeight: 600 }}>OR LINK</span>
                  <div style={{ flex: 1, height: '1px', backgroundColor: '#DFE1E6' }} />
                </div>

                {/* Embed via Web URL (div container instead of form to avoid nested form errors) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Paste image or mp4 URL..."
                    value={mediaUrlInput}
                    onChange={(e) => setMediaUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        insertMediaFromUrl(e);
                      }
                    }}
                    className="jira-input"
                    style={{ fontSize: '12px', height: '30px', padding: '4px 8px' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setShowMediaModal(false)}
                      className="jira-btn jira-btn-ghost"
                      style={{ padding: '4px 8px', fontSize: '11px' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!mediaUrlInput.trim()}
                      onClick={insertMediaFromUrl}
                      className="jira-btn jira-btn-primary"
                      style={{ padding: '4px 12px', fontSize: '11px' }}
                    >
                      Insert
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

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
                setShowColorMenu(false);
                setShowMediaModal(false);
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

      {/* 2. JIRA INLINE IMAGE/VIDEO FLOATING TOOLBAR */}
      {selectedMediaNode && !readOnly && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            backgroundColor: '#1D2125',
            color: '#FFFFFF',
            borderRadius: '6px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            margin: '8px 12px',
            width: 'fit-content',
            fontSize: '12px',
            zIndex: 50,
          }}
        >
          {/* Size controls only for Image */}
          {selectedMediaNode.type === 'image' && (
            <>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#A6C5E2' }}>SIZE:</span>
              {[
                { label: '25%', val: '25%' },
                { label: '50%', val: '50%' },
                { label: '75%', val: '75%' },
                { label: '100%', val: '100%' },
              ].map((sz) => (
                <button
                  key={sz.label}
                  type="button"
                  onClick={() => setImageWidth(sz.val)}
                  style={{
                    padding: '2px 8px',
                    borderRadius: '3px',
                    border: 'none',
                    backgroundColor: selectedMediaNode.width === sz.val ? '#0052CC' : '#2C333A',
                    color: '#FFFFFF',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {sz.label}
                </button>
              ))}
              <div style={{ width: '1px', height: '14px', backgroundColor: '#454F59', margin: '0 4px' }} />
            </>
          )}

          {/* Align controls only for Image */}
          {selectedMediaNode.type === 'image' && (
            <>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#A6C5E2' }}>ALIGN:</span>
              <button
                type="button"
                onClick={() => setMediaAlignment('left')}
                style={{
                  padding: '4px',
                  borderRadius: '3px',
                  border: 'none',
                  backgroundColor: (!selectedMediaNode.alignment || selectedMediaNode.alignment === 'left') ? '#0052CC' : 'transparent',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                }}
                title="Align Left"
              >
                <AlignLeft size={13} />
              </button>
              <button
                type="button"
                onClick={() => setMediaAlignment('center')}
                style={{
                  padding: '4px',
                  borderRadius: '3px',
                  border: 'none',
                  backgroundColor: selectedMediaNode.alignment === 'center' ? '#0052CC' : 'transparent',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                }}
                title="Align Center"
              >
                <AlignCenter size={13} />
              </button>
              <button
                type="button"
                onClick={() => setMediaAlignment('right')}
                style={{
                  padding: '4px',
                  borderRadius: '3px',
                  border: 'none',
                  backgroundColor: selectedMediaNode.alignment === 'right' ? '#0052CC' : 'transparent',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                }}
                title="Align Right"
              >
                <AlignRight size={13} />
              </button>

              <div style={{ width: '1px', height: '14px', backgroundColor: '#454F59', margin: '0 4px' }} />
            </>
          )}

          <button
            type="button"
            onClick={handleRemoveSelectedMedia}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '3px',
              border: 'none',
              backgroundColor: '#DE350B',
              color: '#FFFFFF',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            title="Delete from document and remove file from server storage"
          >
            <Trash2 size={12} />
            <span>Remove</span>
          </button>
        </div>
      )}

      {/* 3. JIRA INLINE LINK MODAL / POPOVER (div instead of form) */}
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSaveLink(e);
                  }
                }}
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSaveLink(e);
                  }
                }}
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
                  type="button"
                  onClick={handleSaveLink}
                  className="jira-btn jira-btn-primary"
                  style={{ padding: '4px 14px', fontSize: '12px' }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. TIPTAP EDITOR CONTENT WRAPPER */}
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

        /* Images and Video Players inside description */
        .tiptap img {
          max-width: 100%;
          height: auto;
          border-radius: 6px;
          margin: 8px 0;
          border: 1px solid #DFE1E6;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease, outline 0.15s ease;
        }
        .tiptap img.ProseMirror-selectednode, .tiptap img:hover {
          outline: 2px solid #0052CC;
          box-shadow: 0 4px 16px rgba(9, 30, 66, 0.15);
        }

        /* Video wrapper styling and alignment */
        .tiptap .jira-video-wrapper {
          width: 240px !important;
          max-width: 100% !important;
          display: block !important;
          border-radius: 8px;
          border: 1px solid #DFE1E6;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(9, 30, 66, 0.08);
          background: #000;
          cursor: pointer;
          transition: box-shadow 0.2s ease, outline 0.15s ease;
        }
        .tiptap .jira-video-wrapper[data-align="center"] {
          margin: 8px auto !important;
        }
        .tiptap .jira-video-wrapper[data-align="right"] {
          margin: 8px 0 8px auto !important;
        }
        .tiptap .jira-video-wrapper[data-align="left"] {
          margin: 8px auto 8px 0 !important;
        }
        .tiptap .jira-video-wrapper.ProseMirror-selectednode, .tiptap .jira-video-wrapper:hover {
          outline: 2px solid #0052CC;
          box-shadow: 0 4px 16px rgba(9, 30, 66, 0.15);
        }
        .tiptap video {
          width: 100%;
          max-height: 160px;
          border-radius: 6px;
          display: block;
          background: #000;
          object-fit: contain;
        }
      `}</style>
    </div>
  );
};
