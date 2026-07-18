# Checklist de Aprovação da Malha Esculpida

Antes de converter o `morro_clean_sculpt.glb` e integrar no runtime, a malha deve passar por estes 6 critérios obrigatórios no Blender:

- [ ] **1. Silhueta Monumental:** O perfil do morro corresponde às fotos de referência ortográficas (frente e lado)? Ele parece o Morro da Urca, e não um cone genérico?
- [ ] **2. Base Fechada (Watertight/Skirt):** A malha possui uma face inferior fechada ou uma borda ("saia") que se estende abaixo do nível zero (Z=0 no Blender), garantindo que não haverá vãos quando a água interceptar a rocha?
- [ ] **3. UV Mapping Contínuo:** O mapeamento UV foi feito através de `Project from View` (visão de topo) para garantir que a textura `morro.jpg` seja projetada sem recortes (*seams*) perceptíveis nas faces verticais?
- [ ] **4. Contagem de Polígonos:** A malha foi otimizada (Decimate/Remesh) para ter entre **15.000 e 35.000 triângulos** (ideal para WebGL mantendo detalhe)? 
- [ ] **5. Ausência de N-Gons:** Toda a malha foi triangulada antes da exportação (`Ctrl+T` em Edit Mode) ou o exportador glTF está configurado para exportar malha triangulada?
- [ ] **6. Bounding Box & Orientação:** O pivot do objeto está na base, as rotações/escalas foram aplicadas (`Ctrl+A -> All Transforms`), e o exportador glTF está com a opção "+Y Up" ativada?

**Se todos os 6 itens estiverem com *check*, o GLB está pronto para a conversão.**
