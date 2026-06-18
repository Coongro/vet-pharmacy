/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import { getHostReact, getHostUI } from '@coongro/plugin-sdk';

const React = getHostReact();
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const UI = getHostUI();
const { useState, useEffect, useRef, useCallback } = React;
const h = React.createElement;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AutocompleteInputProps<T> {
  /** Función de búsqueda — recibe query, retorna resultados */
  onSearch: (query: string) => Promise<T[]>;
  /** Renderiza cada opción en el dropdown */
  renderOption: (item: T) => unknown;
  /** Callback al seleccionar una opción */
  onSelect: (item: T) => void;
  /** Valor actual del input (texto visible) */
  value: string;
  /** Callback cuando cambia el texto */
  onChange: (value: string) => void;
  /** Placeholder del input */
  placeholder?: string;
  /** Label sobre el input */
  label?: string;
  /** Mínimo de caracteres para buscar (default 2). Usar 0 para modo selector. */
  minChars?: number;
  /** Delay de debounce en ms (default 300) */
  debounceMs?: number;
  /** Desactivar el input */
  disabled?: boolean;
  /** Mostrar chevron para abrir dropdown como selector (default false) */
  showToggle?: boolean;
}

// ─── Componente ─────────────────────────────────────────────────────────────

export function AutocompleteInput<T>(props: AutocompleteInputProps<T>) {
  const {
    onSearch,
    renderOption,
    onSelect,
    value,
    onChange,
    placeholder = '',
    label,
    minChars = 2,
    debounceMs = 300,
    disabled = false,
    showToggle = false,
  } = props;

  const [results, setResults] = useState<T[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(-1);
  const mountedRef = useRef(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  // ID estable para enlazar aria-controls del input con el listbox y los options
  // (permite a la IA leer el estado abierto/opciones y operar el control).
  const listboxIdRef = useRef(`cg-autocomplete-${Math.random().toString(36).slice(2, 9)}`);
  const listboxId = listboxIdRef.current;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const doSearch = useCallback(
    async (query: string) => {
      if (query.length < minChars) {
        setResults([]);
        setIsOpen(false);
        return;
      }
      setLoading(true);
      try {
        const items = await onSearch(query);
        if (!mountedRef.current) return;
        setResults(items ?? []);
        setIsOpen((items ?? []).length > 0);
        setHoveredIndex(-1);
      } catch {
        if (mountedRef.current) {
          setResults([]);
          setIsOpen(false);
        }
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [onSearch, minChars]
  );

  const handleToggle = useCallback(() => {
    if (isOpen) {
      setIsOpen(false);
    } else {
      void doSearch(value);
    }
  }, [isOpen, doSearch, value]);

  const handleChange = useCallback(
    (val: string) => {
      onChange(val);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void doSearch(val);
      }, debounceMs);
    },
    [onChange, doSearch, debounceMs]
  );

  const handleSelect = useCallback(
    (item: T) => {
      onSelect(item);
      setResults([]);
      setIsOpen(false);
    },
    [onSelect]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen || results.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHoveredIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHoveredIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
      } else if (e.key === 'Enter' && hoveredIndex >= 0) {
        e.preventDefault();
        handleSelect(results[hoveredIndex]);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    },
    [isOpen, results, hoveredIndex, handleSelect]
  );

  return h(
    'div',
    { ref: wrapperRef, className: 'relative w-full' },

    // Label
    label ? h(UI.Label, null, label) : null,

    // Input container
    h(
      'div',
      { className: 'relative' },
      h(UI.Input, {
        type: 'text',
        value,
        placeholder,
        disabled,
        className: UI.cn(showToggle && 'pr-7'),
        // ARIA combobox: expone estado y enlace al listbox para lectores/IA.
        role: 'combobox',
        'aria-expanded': isOpen,
        'aria-autocomplete': 'list',
        'aria-controls': listboxId,
        'aria-activedescendant':
          isOpen && hoveredIndex >= 0 ? `${listboxId}-option-${hoveredIndex}` : undefined,
        onChange: (e: { target: { value: string } }) => handleChange(e.target.value),
        onFocus: () => {
          if (value.length >= minChars) {
            // Si ya hay resultados cacheados, abrir; si no, buscar
            if (results.length > 0) {
              setIsOpen(true);
            } else if (minChars === 0) {
              void doSearch(value);
            }
          }
        },
        onKeyDown: handleKeyDown,
      }),

      // Chevron toggle para modo selector
      showToggle && !disabled
        ? h(
            'button',
            {
              type: 'button',
              onClick: handleToggle,
              className:
                'absolute right-1 top-1/2 -translate-y-1/2 flex items-center p-1 bg-transparent border-none cursor-pointer text-cg-text-muted',
              tabIndex: -1,
            },
            h(UI.DynamicIcon, {
              icon: 'ChevronDown',
              size: 14,
              className: UI.cn('transition-transform duration-150', isOpen && 'rotate-180'),
            })
          )
        : null,

      // Indicador de carga
      loading
        ? h(
            'div',
            {
              className: UI.cn(
                'absolute top-1/2 -translate-y-1/2',
                showToggle ? 'right-7' : 'right-3'
              ),
            },
            h(UI.LoadingOverlay, { inline: true, variant: 'dots' })
          )
        : null
    ),

    // Dropdown con resultados
    isOpen && results.length > 0
      ? h(
          'div',
          {
            role: 'listbox',
            id: listboxId,
            className:
              'absolute top-full left-0 right-0 mt-0.5 max-h-[200px] overflow-y-auto bg-cg-bg border border-cg-border rounded-md shadow-md z-50',
          },
          ...results.map((item, idx) =>
            h(
              'div',
              {
                key: idx,
                role: 'option',
                id: `${listboxId}-option-${idx}`,
                'aria-selected': idx === hoveredIndex,
                onMouseDown: (e: MouseEvent) => {
                  e.preventDefault();
                  handleSelect(item);
                },
                // onClick además de onMouseDown: agentes IA disparan click, no mousedown.
                onClick: () => {
                  handleSelect(item);
                },
                onMouseEnter: () => setHoveredIndex(idx),
                className: UI.cn(
                  'px-3 py-2 cursor-pointer text-sm text-cg-text border-b border-cg-border last:border-b-0',
                  idx === hoveredIndex && 'bg-cg-bg-secondary'
                ),
              },
              renderOption(item) as React.ReactNode
            )
          )
        )
      : null,

    // Sin resultados
    isOpen && results.length === 0 && !loading && value.length >= minChars
      ? h(
          'div',
          {
            className:
              'absolute top-full left-0 right-0 mt-0.5 bg-cg-bg border border-cg-border rounded-md shadow-md z-50',
          },
          h('div', { className: 'px-3 py-2 text-sm text-cg-text-muted italic' }, 'Sin resultados')
        )
      : null
  );
}
