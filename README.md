# Finanças da Família

Controle de gastos, contas do mês, dívidas, cartões de crédito e metas para cada pessoa da família.
É um web app instalável (PWA) publicado no GitHub Pages: abre no navegador do computador e pode ser instalado no celular.

- **Uma conta por pessoa**: no primeiro acesso, cada pessoa cria usuário e senha.
- **Dados cifrados com a senha de cada um** (AES-GCM 256 + PBKDF2 600 mil iterações). Ficam no repositório **privado** `financas-data`, ilegíveis sem a senha, nem para quem administra o app.
- **Funciona sem internet**: guarda uma cópia cifrada no aparelho e sincroniza quando a conexão volta. Celular e computador veem os mesmos dados.

## Funcionalidades

| Tela | O que faz |
|---|---|
| Início | Sobra do mês, entradas, dívidas, contas pagas, gastos por categoria, próximas contas, para onde vai o dinheiro |
| Entradas | Salário, 13º, outras rendas recorrentes e entradas extras |
| Gastos do dia a dia | Lançamentos por categoria, com busca e filtros. Compras parceladas contam uma parcela por mês |
| Contas do mês | Checklist de contas fixas, parcelas, faturas de cartão e quanto guardar para as metas |
| Orçamento | Planilha com todos os meses do plano |
| Dívidas | Quanto falta, quando termina, valor à vista (pelos juros), quitação/amortização, repasses para pessoas e parcelado no cartão |
| Cartões | Fatura de cada mês (pelo dia de fechamento), limite usado e próximas faturas |
| Metas | Várias metas (reserva de emergência, viagem…) com valor mensal, prazo, previsão e rendimento |
| Ajustes | Conta (trocar senha, chave de recuperação), backup, importação e todos os itens |

Cadastro facilitado:
- assistente de 4 passos no primeiro acesso;
- botão **+** com gasto, compra no cartão, entrada, conta fixa, dívida e meta;
- recorrência que se renova sozinha: todo mês, todo ano ou a cada N meses, com fim por data ou por quantidade de vezes e reajuste anual;
- “mudar o valor a partir de tal mês”;
- dívidas cadastradas em linguagem simples, como “parcela de R$ X, 24 parcelas, já paguei 6”.

## Configuração (uma vez, por quem administra)

1. Crie um **token fine-grained** no GitHub:
   - Settings → Developer settings → Fine-grained tokens.
   - Repository access: *Only select repositories* → `financas-data`.
   - Permissions: **Contents: Read and write**.
   - Validade: até 1 ano.
2. Abra `tools/setup.html`, que pode estar no site publicado ou num servidor local. Informe:
   - o token;
   - o **código da família**, uma frase longa como `bolo-de-fuba-da-vovo-1987`.
3. Baixe o `config.js` gerado, substitua o deste repositório e faça commit/push. O token vai **cifrado** com o código da família.
4. Em *Settings → Pages* deste repositório, escolha publicar a partir da branch `main`, pasta `/ (root)`.
5. Mande o **link de convite** gerado (`…/financas/#convite=…`) para a família. Quem abrir já cai na tela de criar conta. Sem o link, o app pede o código da família uma vez por aparelho.

Para trocar o token antes de vencer, repita os passos 1 a 3. As contas e os dados não mudam.

## Segurança (o que esperar)

**O que está protegido**
- Os dados de cada pessoa são cifrados no navegador com uma chave aleatória.
- Essa chave fica guardada “embrulhada” pela senha da pessoa e por uma **chave de recuperação**, mostrada uma única vez ao criar a conta.
- Sem a senha ou a chave de recuperação, ninguém lê os dados, nem quem tem acesso ao repositório.
- Se a pessoa perder as duas, os dados não podem ser recuperados (a não ser por um backup exportado).

**Limites desta arquitetura**
- O app não tem servidor. O token do GitHub fica cifrado no `config.js` público e é aberto com o código da família, por isso o código deve ser **longo**.
- Quem souber o código da família consegue gravar no repositório de dados: pode estragar ou apagar arquivos de outras pessoas, mas não consegue lê-los.
- O histórico do git permite desfazer qualquer estrago.
- É um modelo pensado para uma família, não para usuários desconhecidos.

## Estrutura

```
index.html            casca do app
config.js             gerado por tools/setup.html (token cifrado)
css/app.css
js/core.js            utilidades e constantes
js/crypto.js          PBKDF2 / AES-GCM, chave de recuperação
js/cloud.js           API do GitHub, contas, sessão
js/store.js           estado, recorrências, junção de dados entre aparelhos, sincronização
js/calc.js            cálculos (mês, dívidas, cartões, metas)
js/ui.js              modais, diálogos, gráficos
js/views.js           telas
js/forms.js           formulários
js/app.js             login, assistente, ações, inicialização
sw.js, manifest.webmanifest   PWA
tools/setup.html      configuração (token + código da família + convite)
```

Não há build nem dependências: são arquivos estáticos. Para testar localmente, rode `npx serve` ou `python -m http.server` na pasta e abra `http://localhost:…`.
O app precisa de http(s) por causa do Web Crypto e do service worker.

Ao publicar uma versão nova, aumente o número do `CACHE` em `sw.js` para os celulares pegarem a atualização.
