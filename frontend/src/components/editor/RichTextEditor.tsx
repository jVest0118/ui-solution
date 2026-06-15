import React from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import { Button, Space, Tooltip } from 'antd'
import {
  BoldOutlined, ItalicOutlined, StrikethroughOutlined,
  OrderedListOutlined, UnorderedListOutlined, LinkOutlined,
  UndoOutlined, RedoOutlined, CodeOutlined, MinusOutlined
} from '@ant-design/icons'

interface Props {
  value?: string
  onChange?: (html: string) => void
  placeholder?: string
  disabled?: boolean
  minHeight?: number
}

const ToolbarBtn: React.FC<{
  title: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}> = ({ title, active, disabled, onClick, children }) => (
  <Tooltip title={title}>
    <Button
      size="small"
      type={active ? 'primary' : 'default'}
      disabled={disabled}
      onClick={onClick}
      style={{ padding: '0 6px' }}
    >
      {children}
    </Button>
  </Tooltip>
)

export const RichTextEditor: React.FC<Props> = ({
  value = '',
  onChange,
  placeholder = '내용을 입력하세요...',
  disabled = false,
  minHeight = 200,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: false }),
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
  })

  if (!editor) return null

  const addLink = () => {
    const url = window.prompt('URL을 입력하세요:', 'https://')
    if (!url) return
    if (editor.state.selection.empty) {
      editor.chain().focus().insertContent(`<a href="${url}">${url}</a>`).run()
    } else {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  return (
    <div style={{
      border: `1px solid ${disabled ? '#d9d9d9' : '#d9d9d9'}`,
      borderRadius: 6,
      overflow: 'hidden',
      background: disabled ? '#f5f5f5' : '#fff',
    }}>
      {!disabled && (
        <div style={{
          padding: '6px 8px',
          borderBottom: '1px solid #f0f0f0',
          background: '#fafafa',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
        }}>
          <Space size={2} wrap>
            <ToolbarBtn title="굵게 (Ctrl+B)" active={editor.isActive('bold')}
              onClick={() => editor.chain().focus().toggleBold().run()}>
              <BoldOutlined />
            </ToolbarBtn>
            <ToolbarBtn title="기울임 (Ctrl+I)" active={editor.isActive('italic')}
              onClick={() => editor.chain().focus().toggleItalic().run()}>
              <ItalicOutlined />
            </ToolbarBtn>
            <ToolbarBtn title="취소선" active={editor.isActive('strike')}
              onClick={() => editor.chain().focus().toggleStrike().run()}>
              <StrikethroughOutlined />
            </ToolbarBtn>
            <ToolbarBtn title="인라인 코드" active={editor.isActive('code')}
              onClick={() => editor.chain().focus().toggleCode().run()}>
              <CodeOutlined />
            </ToolbarBtn>

            <div style={{ width: 1, height: 20, background: '#d9d9d9', margin: '0 2px' }} />

            {[1, 2, 3].map(level => (
              <ToolbarBtn key={level} title={`제목 ${level}`}
                active={editor.isActive('heading', { level })}
                onClick={() => editor.chain().focus().toggleHeading({ level: level as 1|2|3 }).run()}>
                <span style={{ fontSize: 11, fontWeight: 600 }}>H{level}</span>
              </ToolbarBtn>
            ))}

            <div style={{ width: 1, height: 20, background: '#d9d9d9', margin: '0 2px' }} />

            <ToolbarBtn title="순서 없는 목록" active={editor.isActive('bulletList')}
              onClick={() => editor.chain().focus().toggleBulletList().run()}>
              <UnorderedListOutlined />
            </ToolbarBtn>
            <ToolbarBtn title="순서 있는 목록" active={editor.isActive('orderedList')}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}>
              <OrderedListOutlined />
            </ToolbarBtn>
            <ToolbarBtn title="코드 블록" active={editor.isActive('codeBlock')}
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
              <span style={{ fontSize: 11 }}>{'</>'}</span>
            </ToolbarBtn>
            <ToolbarBtn title="인용구" active={editor.isActive('blockquote')}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}>
              <span style={{ fontSize: 14, fontStyle: 'italic' }}>"</span>
            </ToolbarBtn>
            <ToolbarBtn title="구분선"
              onClick={() => editor.chain().focus().setHorizontalRule().run()}>
              <MinusOutlined />
            </ToolbarBtn>
            <ToolbarBtn title="링크" active={editor.isActive('link')} onClick={addLink}>
              <LinkOutlined />
            </ToolbarBtn>

            <div style={{ width: 1, height: 20, background: '#d9d9d9', margin: '0 2px' }} />

            <ToolbarBtn title="실행 취소" onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}>
              <UndoOutlined />
            </ToolbarBtn>
            <ToolbarBtn title="다시 실행" onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}>
              <RedoOutlined />
            </ToolbarBtn>
          </Space>
        </div>
      )}

      <EditorContent
        editor={editor}
        style={{ minHeight, padding: '10px 12px', cursor: disabled ? 'not-allowed' : 'text' }}
      />

      <style>{`
        .ProseMirror { outline: none; }
        .ProseMirror p.is-editor-empty:first-child::before {
          color: #aaa; float: left; content: attr(data-placeholder); pointer-events: none; height: 0;
        }
        .ProseMirror h1 { font-size: 1.6em; font-weight: 700; margin: .5em 0; }
        .ProseMirror h2 { font-size: 1.3em; font-weight: 700; margin: .5em 0; }
        .ProseMirror h3 { font-size: 1.1em; font-weight: 700; margin: .5em 0; }
        .ProseMirror ul, .ProseMirror ol { padding-left: 1.4em; }
        .ProseMirror blockquote { border-left: 3px solid #d9d9d9; margin: 0; padding-left: 12px; color: #666; }
        .ProseMirror code { background: #f0f0f0; border-radius: 3px; padding: 1px 4px; font-family: monospace; }
        .ProseMirror pre { background: #1e1e1e; color: #d4d4d4; border-radius: 6px; padding: 12px; overflow-x: auto; }
        .ProseMirror pre code { background: none; color: inherit; padding: 0; }
        .ProseMirror hr { border: none; border-top: 2px solid #eee; margin: 12px 0; }
        .ProseMirror a { color: #1677ff; text-decoration: underline; }
      `}</style>
    </div>
  )
}
