# Monitoramento de Impressão 3D Através do Áudio

O presente trabalho tem como objetivo capturar os ruídos produzidos por uma impressora 3D durante sua operação. Posteriormente, esses dados sonoros são comparados com as configurações de impressão e com o arquivo G-code (comandos de controle numérico). A meta é extrair informações sobre o funcionamento do equipamento, identificando pontos de estresse mecânico, níveis de ruído e o impacto das configurações de impressão.

O áudio é um indicador poderoso do que está acontecendo em muitos sistemas mecânicos e elétricos, e o monitoramento acústico de impressoras 3D não é exceção.

## Fontes de Dados

1. **Arquivos G-code**: São a linguagem de programação utilizada principalmente para o controle numérico computadorizado (CNC) de máquinas-ferramenta. Essas instruções orientam a máquina sobre suas ações. Para este projeto, os arquivos G-code foram gerados pelo software fatiador Slic3r. Em termos simples, fatiadores transformam modelos 3D e parâmetros de impressão em arquivos G-code, permitindo que a impressora 3D materialize o design virtual. O modelo 3D escolhido foi o 3DBenchy, concebido especificamente para testar e calibrar impressoras 3D. O design complexo deste modelo desafia a impressora de diversas maneiras.
    
    [Sobre 3DBenchy](https://www.3dbenchy.com/about/)
    
    Para otimizar a análise dos dados, programamos uma pausa de um segundo ao final de cada camada de impressão.

2. **Monitoramento de Áudio**: A coleta sonora foi realizada durante o processo de impressão de um modelo Graber I3, fabricado pela GT Max. Utilizou-se um captador piezelétrico passivo conectado a uma interface de áudio M-audio Fast Track. Esse método permite a captação dos sons da máquina, minimizando interferências externas.

## Tratamento dos Dados

O arquivo G-code é estruturado com comandos listados linha a linha. Para facilitar a análise, desenvolvemos um script que converte esse formato padrão de G-code em uma tabela CSV, com os comandos dispostos nas colunas. Um segundo script adiciona uma coluna "layer", representando o número da camada em questão.

Devido a questões de viabilidade, tratamos apenas o arquivo de áudio correspondente a 5 camadas específicas: 1, 2, 100, 150 e 241 (última camada). Cada faixa de áudio foi convertida em um arquivo CSV contendo as colunas "tempo" e "amplitude". Um segundo script aplica a Transformada de Fourier a esses dados e salva os resultados em um novo arquivo CSV, com as colunas "frequência" e "magnitude".

## Scripts de Ingestão de Dados no Hive

Os arquivos foram inicialmente carregados em um bucket do Google Cloud e, em seguida, transferidos para uma máquina virtual por meio do `gcsfuse`. Os comandos abaixo ilustram esses passos:

```bash
export GCSFUSE_REPO=gcsfuse-$(lsb_release -c -s)
echo "deb http://packages.cloud.google.com/apt $GCSFUSE_REPO main" | sudo tee /etc/apt/sources.list.d/gcsfuse.list
curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key add -
sudo apt-get update
sudo apt-get install gcsfuse
```

```bash
gcsfuse my-bucket my-folder
```

Posteriormente, as tabelas foram transferidas para o HDFS com os comandos abaixo:

Criando uma pasta no HDFS:
```bash
hdfs dfs -mkdir /user/my-user/folder-to-paste
```

Carregando um arquivo da VM para dentro do HDFS:
```bash
hdfs dfs -put my-file /user/my-user/folder-to-paste
```

## Scripts de Criação do Banco de Dados no Hive

A conexão com o Hive foi estabelecida via `beeline`:

```bash
beeline -u jdbc:hive2://localhost:10000/default -n <usuario>@<cluster> -d org.apache.hive.jdbc.HiveDriver
```

Foi criada uma base de dados chamada `3d_printing`, e as tabelas foram criadas e populadas seguindo as instruções específicas para cada uma delas. Estas incluem tabelas de Transformada de Fourier e tabelas de amplitude, bem como a tabela principal contendo os comandos de G-code.

O resultado da execução desses scripts inclui as seguintes tabelas:

- gcode
- layer_100_amplitude
- layer_100_fourier_transform
- layer_150_amplitude
- layer_150_fourier_transform
- layer_1_amplitude
- layer_1_fourier_transform
- layer_241_amplitude
- layer_241_fourier_transform
- layer_2_amplitude
- layer_2_fourier_transform


## Scripts com as consultas SQL que foram utilizadas nas análises

### Comparando as tabelas de amplitude com as de fourier_transform

Nesta consulta, duas subconsultas são usadas para calcular a amplitude média e a magnitude máxima para cada uma das camadas. Em seguida, é feito um JOIN dessas subconsultas na coluna Layer para relacionar as duas métricas para cada camada.

O resultado final é uma tabela com a amplitude média e a magnitude máxima da transformada de Fourier para cada camada, permitindo ver como essas duas métricas estão relacionadas.

```sql
SELECT avg_amp.Layer, avg_amp.avg_amplitude, max_mag.max_magnitude FROM (
  SELECT 1 as Layer, AVG(AMPLITUDE) as avg_amplitude FROM layer_1_amplitude
  UNION ALL
  SELECT 2 as Layer, AVG(AMPLITUDE) as avg_amplitude FROM layer_2_amplitude
  UNION ALL
  SELECT 100 as Layer, AVG(AMPLITUDE) as avg_amplitude FROM layer_100_amplitude
  UNION ALL
  SELECT 150 as Layer, AVG(AMPLITUDE) as avg_amplitude FROM layer_150_amplitude
  UNION ALL
  SELECT 241 as Layer, AVG(AMPLITUDE) as avg_amplitude FROM layer_241_amplitude
) as avg_amp
JOIN (
  SELECT 1 as Layer, MAX(MAGNITUDE) as max_magnitude FROM layer_1_fourier_transform
  UNION ALL
  SELECT 2 as Layer, MAX(MAGNITUDE) as max_magnitude FROM layer_2_fourier_transform
  UNION ALL
  SELECT 100 as Layer, MAX(MAGNITUDE) as max_magnitude FROM layer_100_fourier_transform
  UNION ALL
  SELECT 150 as Layer, MAX(MAGNITUDE) as max_magnitude FROM layer_150_fourier_transform
  UNION ALL
  SELECT 241 as Layer, MAX(MAGNITUDE) as max_magnitude FROM layer_241_fourier_transform
) as max_mag
ON avg_amp.Layer = max_mag.Layer
ORDER BY avg_amp.Layer;
```

INFO: Time taken: 28.338 seconds
| layer  | avg_amp.avg_amplitude   | max_mag.max_magnitude  |
|--------|-------------------------|------------------------|
| 1      | -2.2628841783918445E-4  | 948.4506581323221      |
| 2      | -2.138162892475898E-4   | 452.2725970605388      |
| 100    | -1.8500490278099303E-4  | 195.86288975551724     |
| 150    | -1.7626705870238876E-4  | 92.72628933563828      |
| 241    | -2.444988932977684E-4   | 35.25318272318691      |


- `avg_amp.avg_amplitude`: Esta é a amplitude média para cada camada. A amplitude é uma medida da variação de sinal, ou, no contexto de impressão 3D, pode representar o quanto o áudio ou a vibração varia. Valores mais próximos de zero geralmente indicam menos variação, enquanto valores mais altos indicam mais.

- `max_mag.max_magnitude`: Este é o valor máximo da magnitude da Transformada de Fourier para cada camada. A magnitude da Transformada de Fourier indica a "força" ou amplitude de uma determinada frequência no sinal de áudio. Um valor maior indica uma frequência mais proeminente.

**Análise:**
Amplitude média: As camadas 150 e 100 têm as menores amplitudes médias, o que pode indicar menos variação ou "ruído" nessas camadas, enquanto a camada 241 tem a maior amplitude média. Isso pode ser útil para identificar camadas que podem exigir atenção adicional devido à alta variação na amplitude.

Magnitude Máxima da Frequência: A camada 1 tem uma magnitude máxima significativamente mais alta comparada às outras. Isso pode indicar uma frequência dominante muito mais forte ou proeminente durante a impressão dessa camada. Em contraste, a camada 241 tem a menor magnitude máxima, indicando que nenhuma frequência é tão proeminente quanto nas outras camadas.

Correlação: Observando os dois valores juntos, pode-se tentar encontrar uma relação entre a amplitude média e a frequência dominante. Por exemplo, a camada 1 tem a maior magnitude máxima e uma amplitude média relativamente alta, o que pode sugerir que quando há uma frequência dominante, há também uma variação maior no sinal de áudio ou vibração.

### Somatório dos comandos por camadas

```sql
SELECT Layer, Command, COUNT(*) as Command_Count
FROM gcode
WHERE Layer IN (1, 2, 100, 150, 241)
GROUP BY Layer, Command
ORDER BY Layer, Command_Count DESC;
```

INFO:  Time taken: 10.663 seconds
| layer  | command  | command_count  |
|--------|----------|----------------|
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
| 241    | G4       | 113            |
| 241    | G92      | 2              |
| 241    | M104     | 1              |
| 241    | M140     | 1              |


- `layer`: O número da camada

- `command`: O comando G-code emitido

- `command_count`: O número de vezes que o comando foi emitido

**Análise:**
- Camadas mais baixas (1 e 2) têm mais comandos `G1`, que são usados para movimentos lineares, indicando talvez uma maior complexidade nessas camadas.
- Camadas superiores (100, 150, 241) têm menos comandos `G1`, o que pode indicar que são mais simples ou têm menos material sendo depositado.
- A camada 241 tem comandos especiais como `M104` e `M140`, que são geralmente relacionados à temperatura do extrusor e da cama, respectivamente.

### O somatório de ocorrências não nulas para os comandos X, Y, E, F

```sql
SELECT 
    Layer,
    COUNT(X) as X_Count,
    COUNT(Y) as Y_Count,
    COUNT(E) as E_Count,
    COUNT(F) as F_Count
FROM gcode
GROUP BY Layer
ORDER BY Layer;
```

INFO: Time taken: 10.328 seconds
| layer  | x_count  | y_count  | e_count  | f_count  |
|--------|----------|----------|----------|----------|
| 1      | 1681     | 1681     | 1710     | 226      |
| 2      | 1598     | 1598     | 1613     | 207      |
| 100    | 486      | 486      | 477      | 65       |
| 150    | 144      | 144      | 139      | 52       |
| 241    | 224      | 224      | 222      | 16       |

- `x_count`, `y_count`, `e_count`, `f_count`: O número de ocorrências não nulas dessas variáveis em cada camada.

**Análise:**
- Mais uma vez, camadas mais baixas têm mais ocorrências de X, Y, E, e F, indicando possivelmente mais movimento e extrusão.
- A frequência de comandos de velocidade (`F`) é consideravelmente menor em camadas superiores, talvez indicando um ritmo de impressão mais estável ou lento.



### correlação entre a frequência dominante com a velocidade de avanço

```sql
SELECT fr.Layer, fr.avg_feed_rate, fq.max_frequency
FROM (
    SELECT Layer, AVG(F) as avg_feed_rate
    FROM gcode
    WHERE Layer IN (1, 2, 100, 150, 241) AND F IS NOT NULL
    GROUP BY Layer
) fr
JOIN (
    SELECT Layer, MAX(FREQUENCY) as max_frequency
    FROM (
        SELECT 1 AS Layer, FREQUENCY FROM layer_1_fourier_transform
        UNION ALL
        SELECT 2 AS Layer, FREQUENCY FROM layer_2_fourier_transform
        UNION ALL
        SELECT 100 AS Layer, FREQUENCY FROM layer_100_fourier_transform
        UNION ALL
        SELECT 150 AS Layer, FREQUENCY FROM layer_150_fourier_transform
        UNION ALL
        SELECT 241 AS Layer, FREQUENCY FROM layer_241_fourier_transform
    ) AS temp
    GROUP BY Layer
) fq
ON fr.Layer = fq.Layer
ORDER BY fq.max_frequency DESC, fr.avg_feed_rate DESC;
```

INFO: Time taken: 76.947 seconds
| fr.layer  | fr.avg_feed_rate     | fq.max_frequency     |
|-----------|----------------------|----------------------|
| 1         | 3499.1150442477874   | 22049.98948574066    |
| 2         | 3837.68115942029     | 22049.978971481323   |
| 100       | 4440.0               | 22049.957942962646   |
| 150       | 3623.076923076923    | 22049.915885925293   |
| 241       | 4650.0               | 22049.663543701172   |

**Análise:**
Esses dados fornecem uma visão sobre a relação entre a frequência dominante (mais alta) de cada camada e a velocidade média de avanço (`F`) também para cada camada. 

- **Frequência Dominante (Max Frequency)**: Os valores são muito semelhantes entre as diferentes camadas, indicando que a característica dominante de frequência é consistente ao longo das camadas. Essa frequência pode estar relacionada a algum aspecto fundamental do processo de impressão ou do equipamento em uso.

- **Velocidade Média de Avanço**: Os valores diferem entre as camadas, o que indica que a velocidade com que o extrusor ou a cabeça de impressão se move varia entre as camadas. Pode ser observado que a camada 100 e a camada 241 têm as velocidades de avanço médio mais altas.

- **Correlação**: A correlação direta entre a frequência dominante e a velocidade de avanço média não parecem mostrar uma relação óbvia à primeira vista. Ambos os parâmetros variam entre as camadas, mas não de uma maneira que sugira uma relação simples.

### Estudos sobre amplitude
Em contextos industriais como impressão 3D, controle de máquinas ou monitoramento de equipamentos, a amplitude pode fornecer informações sobre a estabilidade ou qualidade do processo.

### Qual é a ordem das camadas em relação a maior amplitude?

```sql
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
```

INFO:  Time taken: 39.567 seconds
| temp_table.table_name  | temp_table.max_amplitude  |
|------------------------|---------------------------|
| layer_241_amplitude    | 7.019257172942162E-4      |
| layer_1_amplitude      | 6.408886983990669E-4      |
| layer_2_amplitude      | 6.103701889514923E-4      |
| layer_100_amplitude    | 5.188146606087685E-4      |
| layer_150_amplitude    | 4.272591322660446E-4      |

### Qual é a ordem das camadas em relação a menor amplitude?

```sql
SELECT * FROM (
    SELECT 'layer_100_amplitude' as table_name, MIN(AMPLITUDE) as min_amplitude FROM layer_100_amplitude
    UNION ALL
    SELECT 'layer_150_amplitude' as table_name, MIN(AMPLITUDE) as min_amplitude FROM layer_150_amplitude
    UNION ALL
    SELECT 'layer_1_amplitude' as table_name, MIN(AMPLITUDE) as min_amplitude FROM layer_1_amplitude
    UNION ALL
    SELECT 'layer_241_amplitude' as table_name, MIN(AMPLITUDE) as min_amplitude FROM layer_241_amplitude
    UNION ALL
    SELECT 'layer_2_amplitude' as table_name, MIN(AMPLITUDE) as min_amplitude FROM layer_2_amplitude
) AS temp_table
ORDER BY min_amplitude ASC
LIMIT 5;
```

INFO: Time taken: 42.8 seconds
| temp_table.table_name  | temp_table.min_amplitude  |
|------------------------|---------------------------|
| layer_241_amplitude    | -0.001251220703125        |
| layer_1_amplitude      | -0.0010986328125          |
| layer_2_amplitude      | -0.001007080078125        |
| layer_100_amplitude    | -9.1552734375E-4          |
| layer_150_amplitude    | -7.9345703125E-4          |

### Qual é a amplitude média das camadas, ordenado de forma crescente?

```sql
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
```

INFO: Time taken: 44.064 seconds
|   layer    |      avg_amplitude      |
|------------|-------------------------|
| layer_150  | -1.7626705870238876E-4  |
| layer_100  | -1.8500490278099303E-4  |
| layer_2    | -2.138162892475898E-4   |
| layer_1    | -2.2628841783918445E-4  |
| layer_241  | -2.444988932977684E-4   |

**Análise:**

- **Amplitude Máxima**: 
A layer_241_amplitude tem a maior amplitude máxima, indicando que esta camada tem os valores mais extremos (seja na forma de picos ou vales) em comparação com as outras camadas.
A amplitude máxima parece diminuir à medida que você vai das camadas superiores (layer_241) para as camadas inferiores (layer_150).
- **Amplitude Mínima**:
A layer_241_amplitude também tem a amplitude mínima mais negativa, novamente sugerindo que esta camada tem os valores mais extremos.
A amplitude mínima se torna menos negativa à medida que você vai das camadas superiores para as inferiores.
- **Amplitude Média**
A layer_241 tem a amplitude média mais negativa, o que pode indicar que esta camada tem uma tendência geral para valores mais baixos em comparação com as outras camadas.
Os valores da amplitude média são todos negativos e diminuem (ficam mais negativos) à medida que você vai da layer_150 para a layer_241.

## Estudos Futuros

#### Análise de Seção Completa de Impressão 3D
É recomendável conduzir uma análise abrangente que inclua dados de todas as camadas de uma seção completa de impressão 3D. Isso permitirá uma avaliação mais completa e precisa das métricas de amplitude e magnitude da Transformada de Fourier em diferentes estágios do processo de impressão.

#### Coleta de Dados em Múltiplas Seções de Impressão 3D
Para robustecer a análise, é aconselhável coletar dados de mais de uma seção de impressão 3D. Isso ajudará a identificar padrões ou variações consistentes e fornecerá um conjunto de dados mais amplo para análise estatística.

#### Correlação com Dados de Software de Controle
Outra área para investigação futura é a coleta e análise de saídas de comandos do software de controle da impressora 3D. Estes dados, geralmente já estruturados em forma de tabelas, contêm informações como o horário de execução de cada comando. A correlação desses dados com as métricas de amplitude e magnitude da Transformada de Fourier poderá permitir uma identificação mais precisa do padrão sonoro associado a cada comando específico.