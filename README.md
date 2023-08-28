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


- **Relatório**

Tratamento dos dados
O arquivo G-code é composto por comandos listados linha por linha.
Foi desenvolvido um script que converte o formato padrão de G-code em uma tabela csv contendo os comandos nas colunas. Um segundo script se encarrega de acrescentar a coluna layer que representa o número da camada.

Apenas por questão de viabilidade o arquivo de audio foi tratado e as faixas correspondentes a 5 camadas foram extraídas, audios referentes as camadas 1, 2, 100, 150, 241(ultima camada).

Por meio de um script cada faixa de audio foi convertida em um CSV com as colunas tempo e amplitude.
Um segundo script aplicou transformada de fourier e salvou cada arquivo em um csv com as colunas frequência e magnitude.

- **Scripts de ingestão de dados no Hive**
Os arquivos foram carregados em um bucket do Google Cloud

Foram transferidos para a máquina virtual por meio do gcsfuse

```
export GCSFUSE_REPO=gcsfuse-lsb_release -c -s
echo "deb http://packages.cloud.google.com/apt $GCSFUSE_REPO main" | sudo tee /etc/apt/sources.list.
curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key add -
sudo apt-get update
sudo apt-get install gcsfuse
```
```
gcsfuse my-bucket my-folder
```

As tabelas foram transferidas para o HDFS com os comandos:

Criando uma pasta no HDFS

```
hdfs dfs -mkdir /user/my-user/folder-to-paste
```

Carregando um arquivo da VM para dentro do HDFS

```
hdfs dfs -put my-file /user/my-user/folder-to-paste
```

- **Scripts de criação do database no Hive**
Foi criada uma base de dados no HIVE
create database 3d_printing;

As tabelas foram cridas e populadas com os seguintes comandos para cada tabela:

- Tabelas de tranformada de fourier

CREATE TABLE layer_x_fourier_transform (
    FREQUENCY DOUBLE,
    MAGNITUDE DOUBLE
)
ROW FORMAT DELIMITED
FIELDS TERMINATED BY ','
STORED AS TEXTFILE;

LOAD DATA INPATH '/user/asantosthiele/layer-x-fourier-transform.csv' overwrite into table layer_x_fourier_transform;

- Tabelas de tranformada de fourier

CREATE TABLE layer_x_amplitude (
    `TIME` DOUBLE,
    AMPLITUDE DOUBLE
)
ROW FORMAT DELIMITED
FIELDS TERMINATED BY ','
STORED AS TEXTFILE;

LOAD DATA INPATH '/user/asantosthiele/layer-x-amplitude.csv' overwrite into table layer_x_amplitude;

- Tabela G-Code

CREATE TABLE gcode (
    Line INT,
    Command STRING,
    X FLOAT,
    Y FLOAT,
    Z FLOAT,
    E FLOAT,
    F FLOAT,
    Comment STRING,
    Layer INT
)
ROW FORMAT DELIMITED
FIELDS TERMINATED BY ','
STORED AS TEXTFILE;

LOAD DATA INPATH '/user/asantosthiele/gcode.csv' overwrite into table gcode;


O resultado foi:

+------------------------------+
|           tab_name           |
+------------------------------+
| gcode                        |
| layer_100_amplitude          |
| layer_100_fourier_transform  |
| layer_150_amplitude          |
| layer_150_fourier_transform  |
| layer_1_amplitude            |
| layer_1_fourier_transform    |
| layer_241_amplitude          |
| layer_241_fourier_transform  |
| layer_2_amplitude            |
| layer_2_fourier_transform    |
+------------------------------+



- **Scripts com as consultas SQL que foram utilizadas nas análises**

Qual é a ordem das camadas em relação a maior amplitude?

Hive SQL:
SELECT * FROM (
    SELECT 'layer_100_amplitude' as table_name, MAX(AMPLITUDE) as max_amplitude FROM layer_100_amplitude
    UNION ALL
    SELECT 'layer_150_amplitude' as table_name, MAX(AMPLITUDE) as max_amplitude FROM layer_150_amplitude
    UNION ALL
    SELECT 'layer_1_amplitude' as table_name, MAX(AMPLITUDE) as max_amplitude FROM layer_1_amplitude
    UNION ALL
    SELECT 'layer_241_amplitude' as table_name, MAX(AMPLITUDE) as max_amplitude FROM layer_241_amplitude
    UNION ALL
    SELECT 'layer_2_amplitude' as table_name, MAX(AMPLITUDE) as max_amplitude FROM layer_2_amplitude
) AS temp_table
ORDER BY max_amplitude DESC
LIMIT 5;

Resultado:
INFO  : Completed executing command(queryId=hive_20230827192706_47d86549-4694-4249-a070-46fc5113ad8e); Time taken: 39.567 seconds
INFO  : OK
+------------------------+---------------------------+
| temp_table.table_name  | temp_table.max_amplitude  |
+------------------------+---------------------------+
| layer_241_amplitude    | 7.019257172942162E-4      |
| layer_1_amplitude      | 6.408886983990669E-4      |
| layer_2_amplitude      | 6.103701889514923E-4      |
| layer_100_amplitude    | 5.188146606087685E-4      |
| layer_150_amplitude    | 4.272591322660446E-4      |
+------------------------+---------------------------+
5 rows selected (40.285 seconds)


----

Qual é a amplitude média das camadas, ordenado de forma crescente?

Hive sql:
SELECT layer, AVG(AMPLITUDE) as avg_amplitude
FROM (
    SELECT 'layer_1' as layer, AMPLITUDE FROM layer_1_amplitude
    UNION ALL
    SELECT 'layer_2' as layer, AMPLITUDE FROM layer_2_amplitude
    UNION ALL
    SELECT 'layer_100' as layer, AMPLITUDE FROM layer_100_amplitude
    UNION ALL
    SELECT 'layer_150' as layer, AMPLITUDE FROM layer_150_amplitude
    UNION ALL
    SELECT 'layer_241' as layer, AMPLITUDE FROM layer_241_amplitude
) unioned
GROUP BY layer
ORDER BY avg_amplitude DESC
LIMIT 5;


Resultado:
INFO  : Completed executing command(queryId=hive_20230827200052_3e64a96a-63c3-488c-aa35-ce04319798a1); Time taken: 44.064 seconds
INFO  : OK
INFO  : Concurrency mode is disabled, not creating a lock manager
+------------+-------------------------+
|   layer    |      avg_amplitude      |
+------------+-------------------------+
| layer_150  | -1.7626705870238876E-4  |
| layer_100  | -1.8500490278099303E-4  |
| layer_2    | -2.138162892475898E-4   |
| layer_1    | -2.2628841783918445E-4  |
| layer_241  | -2.444988932977684E-4   |
+------------+-------------------------+
5 rows selected (44.644 seconds)

A camada com a maior amplitude média é a 150

-----

### Encontrar a camada com a maior frequência de magnitude

Esta query correlaciona os dados da tabela `gcode` com as tabelas `layer_x_fourier_transform` para encontrar a camada com a maior magnitude de frequência.

frequência

magnitude 


### Somatório dos comandos por camadas
INFO  : Completed executing command(queryId=hive_20230828005601_42c0a6e6-8a99-4371-8e04-5554c053bddf); Time taken: 10.663 seconds
+--------+----------+----------------+
| layer  | command  | command_count  |
+--------+----------+----------------+
| 1      | G1       | 1834           |
| 1      | G92      | 34             |
| 1      | G4       | 1              |
| 2      | G1       | 1736           |
| 2      | G92      | 28             |
| 2      | G4       | 1              |
| 100    | G1       | 524            |
| 100    | G92      | 6              |
| 100    | G4       | 1              |
| 150    | G1       | 179            |
| 150    | G92      | 4              |
| 150    | G4       | 1              |
| 241    | G1       | 233            |
| 241    |          | 113            |
| 241    | G92      | 2              |
| 241    | M104     | 1              |
| 241    | M140     | 1              |
+--------+----------+----------------+
17 rows selected (11.03 seconds)


O somatório de ocorrências não nulas para os comandos X, Y, E, F

INFO  : Completed executing command(queryId=hive_20230828010042_8b925967-7693-435f-8f8f-870e2e37f53d); Time taken: 10.328 seconds
+--------+----------+----------+----------+----------+
| layer  | x_count  | y_count  | e_count  | f_count  |
+--------+----------+----------+----------+----------+
| 1      | 1681     | 1681     | 1710     | 226      |
| 2      | 1598     | 1598     | 1613     | 207      |
| 100    | 486      | 486      | 477      | 65       |
| 150    | 144      | 144      | 139      | 52       |
| 241    | 224      | 224      | 222      | 16       |
+--------+----------+----------+----------+----------+

O modelo impresso não os valores das somas de ocorrências de X e Y são iguais 






























**Futuros estudos**

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

1. **Frequência de Calibração**: Alterações no tom podem indicar que a mesa ou a cabeça de impressão estão desalinhadas e precisam de recalibração.
2. **Estabilidade da Fonte de Alimentação**: Variações ou flutuações no áudio podem indicar problemas na fonte de alimentação ou nos motores.(faixas de audio parada)
3. **Condição dos Rolamentos**: Ruídos agudos ou rangidos podem indicar rolamentos desgastados ou que precisam de lubrificação.(desgaste de peças)
4. **Adesão da Primeira Camada**: Ruídos distintos na fase inicial da impressão podem sinalizar problemas com a adesão da primeira camada ao leito de impressão.
5. **Temperatura e Expansão Térmica**: Embora seja um pouco mais desafiador, variações na sonoridade podem estar relacionadas às mudanças térmicas no equipamento, indicando potenciais problemas de aquecimento ou resfriamento.(delaminação em ABS)
6. **Comparação entre Materiais**: Se a pesquisa se expandir para o uso de diferentes materiais de impressão, os áudios podem ajudar a identificar diferenças sonoras entre os materiais durante a extrusão e a impressão.





