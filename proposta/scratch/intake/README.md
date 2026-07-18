# GEOMETRY INTAKE PIPELINE

Este diretório contém os scripts exatos de validação e ingestão para a nova malha do projeto.

## PRÉ-REQUISITOS
O arquivo `morro_clean.glb` deve ser colocado na raiz do projeto (`C:\pinokio\workspaces\20260426-t5fr6h\grupoconceito360`).

## ORDEM EXATA DE EXECUÇÃO

**1. BACKUP (Crítico)**
Gera uma cópia segura dos assets atuais na pasta `backups/`.
\`\`\`bash
node scratch/intake/backup_asset.js
\`\`\`

**2. TOPOLOGICAL AUDIT**
Verifica se a malha atende aos requisitos mínimos (Watertight, ausência de paredes, pico deslocado).
\`\`\`bash
node scratch/intake/topological_audit.js
\`\`\`

**3. CONVERSION**
Lê o GLB, extrai a malha *unindexed*, planifica num Float32Array e escreve o novo arquivo `.bin` consumido pela Engine.
\`\`\`bash
node scratch/intake/convert_glb_to_bin.js
\`\`\`

## FLUXO DE ROLLBACK
Caso a nova integração quebre o runtime (`App3D-f554a111.js` suba com tela preta ou a fragmentação exploda incorretamente), reverta imediatamente para a cópia salva:
\`\`\`bash
cp scratch/intake/backups/morro_triangles.bin.bak_TIMESTAMP morro_triangles.bin
cp scratch/intake/backups/morro_meta.json.bak_TIMESTAMP morro_meta.json
\`\`\`
Substitua `TIMESTAMP` pelo carimbo exato impresso durante a Execução 1.
