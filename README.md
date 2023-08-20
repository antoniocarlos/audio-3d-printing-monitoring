**Tema**

**Monitoramento de Impressão 3D Através do Áudio**

O presente trabalho tem como objetivo capturar os ruídos produzidos por uma impressora 3D durante sua operação. Posteriormente, esses dados sonoros são comparados com as configurações de impressão e com o arquivo G-code (comandos de controle numérico). A meta é extrair informações sobre o funcionamento do equipamento, identificando pontos de estresse mecânico, níveis de ruído e o impacto das configurações de impressão.

O áudio é um indicador poderoso do que está acontecendo em muitos sistemas mecânicos e elétricos, e o monitoramento acústico de impressoras 3D não é exceção. Expandindo a lista anterior, considere também:

**Fontes de Dados**

1. **Arquivos G-code**: São a linguagem de programação utilizada principalmente para o controle numérico computadorizado (CNC) de máquinas-ferramenta. Essas instruções orientam a máquina sobre suas ações. Para este projeto, os arquivos G-code foram gerados pelo software fatiador Slic3r. Em termos simples, fatiadores transformam modelos 3D e parâmetros de impressão em arquivos G-code, permitindo que a impressora 3D materialize o design virtual. O modelo 3D escolhido foi o 3DBenchy, concebido especificamente para testar e calibrar impressoras 3D. O design complexo deste modelo desafia a impressora de diversas maneiras.
    
    [Sobre 3DBenchy](https://www.3dbenchy.com/about/)
    
    Para otimizar a análise dos dados, programamos uma pausa de um segundo ao final de cada camada de impressão.
    
2. **Arquivo de Parâmetros de Impressão**: Exportado pelo software Slic3r, este arquivo em formato .ini contém as configurações usadas pelo fatiador para gerar o G-code. Estas incluem velocidade de impressão, altura de camada, fluxo de material, entre outros.
3. **Monitoramento de Áudio**: A coleta sonora foi realizada durante o processo de impressão de um modelo Graber I3, fabricado pela GT Max. Utilizou-se um captador piezelétrico passivo conectado a uma interface de áudio M-audio Fast Track. Esse método permite a captação dos sons da máquina, minimizando interferências externas.

**Perguntas a serem Respondidas**

- Quais são os pontos de maior estresse durante a impressão?
- Quantos "cliques" são registrados por camada?
- Como é possível otimizar e melhorar a qualidade de uma impressão 3D?
- Qual é o impacto das configurações de impressão nos resultados obtidos?

1. **Erros de Impressão**: Inconsistências ou alterações no padrão de ruído normal podem indicar problemas na impressão, como deslizamentos, falhas na extrusão ou colisões da cabeça de impressão.
2. **Atuação dos Sensores**: A ativação ou desativação de sensores (como sensores de fim de curso) pode ser capturada, dando indicações sobre seu funcionamento correto.
3. **Mudanças de Direção**: Transições abruptas no áudio podem indicar mudanças rápidas na direção de movimento da cabeça de impressão.
4. **Qualidade de Movimento**: O som pode refletir o quão suavemente a impressora está se movendo. Seções de movimento lento ou rápido demais podem ser identificadas por variações sonoras.(comparativo por camada)
5. **Velocidade e Aceleração**: Através do padrão de ruído, pode ser possível discernir se a impressora está acelerando, desacelerando ou mantendo uma velocidade constante.
6. **Início e Fim da Impressão**: Os sons característicos no início e no final da impressão podem ser identificados, ajudando na demarcação do tempo total do processo.

**Futuros estudos**

1. **Frequência de Calibração**: Alterações no tom podem indicar que a mesa ou a cabeça de impressão estão desalinhadas e precisam de recalibração.
2. **Estabilidade da Fonte de Alimentação**: Variações ou flutuações no áudio podem indicar problemas na fonte de alimentação ou nos motores.(faixas de audio parada)
3. **Condição dos Rolamentos**: Ruídos agudos ou rangidos podem indicar rolamentos desgastados ou que precisam de lubrificação.(desgaste de peças)
4. **Adesão da Primeira Camada**: Ruídos distintos na fase inicial da impressão podem sinalizar problemas com a adesão da primeira camada ao leito de impressão.
5. **Temperatura e Expansão Térmica**: Embora seja um pouco mais desafiador, variações na sonoridade podem estar relacionadas às mudanças térmicas no equipamento, indicando potenciais problemas de aquecimento ou resfriamento.(delaminação em ABS)
6. **Comparação entre Materiais**: Se a pesquisa se expandir para o uso de diferentes materiais de impressão, os áudios podem ajudar a identificar diferenças sonoras entre os materiais durante a extrusão e a impressão.