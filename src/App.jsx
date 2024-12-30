import { useState, useRef, useEffect } from 'react'
import './App.css'

// Custom hook for keyboard shortcuts
function useKeyboardShortcuts({ 
  onSave, 
  onClear, 
  onToggleSidebar,
  onNavigateNotes,
  onSelectNote,
  isSidebarOpen,
  hasNotes
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Save: Cmd+Enter
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        onSave?.()
      }
      // Clear: Esc
      else if (e.key === 'Escape') {
        e.preventDefault()
        if (isSidebarOpen) {
          onToggleSidebar?.()
        } else {
          onClear?.()
        }
      }
      // Toggle Sidebar: Cmd+/
      else if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        onToggleSidebar?.()
      }
      // Navigate notes with arrow keys when sidebar is open
      else if (isSidebarOpen && hasNotes && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault()
        onNavigateNotes?.(e.key === 'ArrowUp' ? -1 : 1)
      }
      // Select note with Enter when sidebar is open
      else if (isSidebarOpen && hasNotes && e.key === 'Enter') {
        e.preventDefault()
        onSelectNote?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onSave, onClear, onToggleSidebar, onNavigateNotes, onSelectNote, isSidebarOpen, hasNotes])
}

function App() {
  const [notes, setNotes] = useState(() => {
    const savedNotes = localStorage.getItem('notes')
    return savedNotes ? JSON.parse(savedNotes) : []
  })
  const [currentNote, setCurrentNote] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedNoteId, setSelectedNoteId] = useState(null)
  const [highlightedNoteIndex, setHighlightedNoteIndex] = useState(0)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const editorRef = useRef(null)

  useEffect(() => {
    if (selectedNoteId) {
      const note = notes.find(n => n.id === selectedNoteId)
      if (note) {
        editorRef.current.innerHTML = note.content
        setCurrentNote(editorRef.current.textContent)
      }
    }
  }, [selectedNoteId, notes])

  useEffect(() => {
    localStorage.setItem('notes', JSON.stringify(notes))
  }, [notes])

  const extractTags = (text) => {
    const tagRegex = /#(\w+)/g
    const tags = []
    let match

    while ((match = tagRegex.exec(text)) !== null) {
      tags.push(match[1].toLowerCase())
    }

    return [...new Set(tags)]
  }

  const removeHashtags = (content) => {
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = content

    const processTextNode = (node) => {
      node.textContent = node.textContent.replace(/#\w+/g, '').replace(/\s+/g, ' ').trim()
    }

    const walk = document.createTreeWalker(
      tempDiv,
      NodeFilter.SHOW_TEXT,
      null,
      false
    )

    let node
    while ((node = walk.nextNode())) {
      processTextNode(node)
    }

    return tempDiv.innerHTML
  }

  const handlePaste = async (e) => {
    e.preventDefault()
    const items = e.clipboardData.items
    let pastedText = ''

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        const reader = new FileReader()
        reader.onload = (event) => {
          const img = document.createElement('img')
          img.src = event.target.result
          img.className = 'editor-image'
          
          const selection = window.getSelection()
          const range = selection.getRangeAt(0)
          range.insertNode(img)
          
          range.setStartAfter(img)
          range.setEndAfter(img)
          selection.removeAllRanges()
          selection.addRange(range)
        }
        reader.readAsDataURL(file)
      }
      else if (item.type === 'text/plain') {
        pastedText = await new Promise(resolve => item.getAsString(resolve))
        document.execCommand('insertText', false, pastedText)
      }
    }
  }

  const addNote = () => {
    const editorContent = editorRef.current.innerHTML
    const textContent = editorRef.current.textContent
    
    if (!editorContent.trim()) return

    const cleanedContent = removeHashtags(editorContent)
    const tags = extractTags(textContent)

    const noteData = {
      id: selectedNoteId || Date.now(),
      timestamp: new Date().toLocaleString(),
      type: 'rich',
      content: cleanedContent,
      tags: tags
    }

    if (selectedNoteId) {
      setNotes(prevNotes => 
        prevNotes.map(note => 
          note.id === selectedNoteId ? noteData : note
        )
      )
    } else {
      setNotes(prevNotes => [...prevNotes, noteData])
    }

    clearCurrentNote()
  }

  const deleteNote = (id) => {
    setNotes(notes.filter(note => note.id !== id))
    if (selectedNoteId === id) {
      clearCurrentNote()
    }
  }

  const clearCurrentNote = () => {
    editorRef.current.innerHTML = ''
    setCurrentNote('')
    setSelectedNoteId(null)
  }

  const selectNote = (id) => {
    setSelectedNoteId(id)
  }

  const getNoteSummary = (content) => {
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = content
    const text = tempDiv.textContent || ''
    return text.length > 60 ? text.substring(0, 60) + '...' : text
  }

  // Reset highlighted note when sidebar closes
  useEffect(() => {
    if (!sidebarOpen) {
      setHighlightedNoteIndex(0)
    }
  }, [sidebarOpen])

  // Update highlighted note when selected note changes
  useEffect(() => {
    if (selectedNoteId) {
      const index = notes.findIndex(note => note.id === selectedNoteId)
      if (index !== -1) {
        setHighlightedNoteIndex(index)
      }
    }
  }, [selectedNoteId, notes])

  const navigateNotes = (direction) => {
    setHighlightedNoteIndex(prevIndex => {
      const newIndex = prevIndex + direction
      if (newIndex < 0) return notes.length - 1
      if (newIndex >= notes.length) return 0
      return newIndex
    })
  }

  const selectHighlightedNote = () => {
    if (notes[highlightedNoteIndex]) {
      selectNote(notes[highlightedNoteIndex].id)
    }
  }

  // Clear delete confirmation when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.delete-btn')) {
        setDeleteConfirmId(null)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  // Register keyboard shortcuts
  useKeyboardShortcuts({
    onSave: () => {
      if (editorRef.current?.textContent.trim()) {
        addNote()
      }
    },
    onClear: clearCurrentNote,
    onToggleSidebar: () => setSidebarOpen(prev => !prev),
    onNavigateNotes: navigateNotes,
    onSelectNote: selectHighlightedNote,
    isSidebarOpen: sidebarOpen,
    hasNotes: notes.length > 0
  })

  return (
    <div className="app-container">
      <button 
        className={'sidebar-toggle ' + (sidebarOpen ? 'open' : '')}
        onClick={() => setSidebarOpen(prev => !prev)}
        aria-label={sidebarOpen ? 'Close sidebar (⌘/)' : 'Open sidebar (⌘/)'}
        title={sidebarOpen ? 'Close sidebar (⌘/)' : 'Open sidebar (⌘/)'}
      >
        {sidebarOpen ? '←' : '→'}
      </button>

      <div className={'sidebar ' + (sidebarOpen ? 'open' : '')}>
        <div className="sidebar-notes">
          {notes.map((note, index) => (
            <div 
              key={note.id} 
              className={'sidebar-note ' + (selectedNoteId === note.id ? 'selected' : '') + (index === highlightedNoteIndex ? ' highlighted' : '')}
            >
              <button
                className={'delete-btn' + (deleteConfirmId === note.id ? ' confirm' : '')}
                onClick={(e) => {
                  e.stopPropagation()
                  if (deleteConfirmId === note.id) {
                    deleteNote(note.id)
                    setDeleteConfirmId(null)
                  } else {
                    setDeleteConfirmId(note.id)
                  }
                }}
                title={deleteConfirmId === note.id ? 'Click to confirm delete' : 'Delete note'}
              >
                {deleteConfirmId === note.id ? '✓' : '×'}
              </button>
              <div onClick={() => selectNote(note.id)}>
                <div className="sidebar-note-content">
                  {getNoteSummary(note.content)}
                </div>
                <div className="sidebar-note-tags">
                  {note.tags.map(tag => '#' + tag).join(' ')}
                </div>
                <div className="sidebar-note-timestamp">
                  {note.timestamp}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="main-content">
        <div className="note-input">
          <div
            ref={editorRef}
            className="rich-editor"
            contentEditable
            onPaste={handlePaste}
            onInput={(e) => setCurrentNote(e.target.textContent)}
            placeholder="Type or paste content here. Add tags with # (e.g., #work). Press ⌘↵ to save."
            role="textbox"
            aria-multiline="true"
          />
          <div className="note-actions">
            <button onClick={addNote} className="save-btn">
              {selectedNoteId ? 'Update' : 'Save'}
            </button>
            <button onClick={clearCurrentNote} className="clear-btn">
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
