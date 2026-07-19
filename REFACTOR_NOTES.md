## Issues found and fixes applied

### Critical
1. CIRCULAR DEPENDENCY: store→registry→widgets→store
   Fix: remove registry import from store; pass defaultSize directly in addWidget via a separate
   lookup that doesn't go through the circular chain — or better: move getDefaultSize out of registry
   into the addWidget call site. Cleanest fix: store never imports registry. Toolbar calls
   addWidget(componentId, {w,h}) — the caller (who already has registry access) provides size.

2. STALE LOCAL STATE IN TextWidget: useState initialises from config prop once; if config
   changes externally (import layout) the local state is forever stale.
   Fix: derive display values from config directly; only use local state for the in-progress edit buffer.

### State management
3. saveLayout() called after EVERY mutation via get().saveLayout() — thrashes localStorage on
   every drag tick. onLayoutChange fires continuously during drag.
   Fix: use Zustand middleware `subscribeWithSelector` + a debounced persist subscriber instead of
   inline saveLayout() calls. Or at minimum: use onDragStop/onResizeStop instead of onLayoutChange.

4. DashboardState interface mixes data shape and action signatures in types/index.ts — couples
   the type layer to Zustand's API shape. Store-internal actions don't belong in the shared type file.
   Fix: export only the data slice types (WidgetNode, DashboardSchema, WidgetLayout, WidgetProps,
   WidgetDefinition) from types. Store defines its own internal interface locally.

5. moveWidget and resizeWidget actions exist in the store but are never called — updateLayouts
   handles both. Dead code.
   Fix: remove them.

### Architecture / coupling
6. WidgetWrapper reaches into the store to call removeWidget — the wrapper shouldn't know about
   the store; it's a presentational component. Renderer already has the store; pass onRemove as prop.

7. isEditMode prop drilled through Renderer→WidgetWrapper→widget component. Widgets don't use it
   (TextWidget declares it but never reads it; ClockWidget ignores it). WidgetWrapper reads it from
   prop but could read from store since it already imports store (after fix #6, it won't).
   Fix: WidgetWrapper reads isEditMode from store directly (one subscription, no prop drilling).
   Remove isEditMode from WidgetProps entirely.

8. Registry class has a dead getComponentById method (duplicate of get()).
   Fix: remove it.

9. Registry imports are hoisted after the singleton is created — relies on JS module evaluation
   order side effects. Works but is fragile.
   Fix: use a plain object map, no class needed. Simpler and explicit.

10. DashboardSchema.version is stored/loaded but never validated or used.
    Fix: keep it but stop pretending it drives behaviour — it's just metadata.

### localStorage abstraction
11. localStorage calls are inline in the store — 4 separate call sites, no error boundary.
    Fix: extract a tiny `persistence` module with load/save typed to DashboardSchema.
