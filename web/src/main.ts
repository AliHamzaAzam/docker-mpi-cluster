import './style.css';
import { input, snapshot, stages, advance, parseResults, type Stage } from './model';
const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
<header><a class="brand" href="#">mpi<span>lab</span><i></i></a><nav aria-label="Main navigation"><a href="#explore">Explore</a><a href="#results">Results</a><a href="#cluster">The cluster</a></nav><a class="source" href="https://github.com/AliHamzaAzam/docker-mpi-cluster">View source ↗</a></header>
<main><section class="hero"><div class="eyebrow"><span></span> A SMALL LAB FOR BIG IDEAS</div><h1>One problem.<br><em>Many working minds.</em></h1><p>See how a lightweight MPI cluster shares the work. Follow the messages, inspect the results, and understand what happens between the nodes.</p><a class="primary" href="#explore">Follow the computation <span>↓</span></a><div class="hero-meta"><span>OpenMPI</span><span>Docker + C / C++</span><span>Open source</span></div></section>
<section id="explore" class="lab"><div class="section-top"><div><div class="eyebrow">01 / THE IDEA, IN MOTION</div><h2>A little work, shared.</h2><p>Square sixteen numbers. Keep their order. Bring the answers home.</p></div><div class="rank-control"><label for="ranks">MPI processes</label><select id="ranks"><option value="1">1 process</option><option value="2">2 processes</option><option value="4" selected>4 processes</option></select></div></div>
<div class="lab-surface"><div class="lab-topline"><span><i class="live-dot"></i> Interactive model</span><span>Not a benchmark · no MPI runs in your browser</span></div><div class="steps" aria-label="Computation stages">${stages.map((name, index) => `<button data-stage="${index}" aria-pressed="${index === 0}"><span>0${index + 1}</span>${name}</button>`).join('')}</div><svg id="diagram" viewBox="0 0 900 360" role="img" aria-labelledby="diagram-title diagram-desc"></svg><div id="rank-values" class="rank-values" role="region" aria-label="Values at this step"></div><div class="lab-bottom"><div aria-live="polite"><strong id="stage-title"></strong><p id="stage-copy"></p></div><div class="controls"><button id="reset" aria-label="Reset computation">Reset</button><button id="step">Next step →</button><button id="play" class="primary" aria-pressed="false">Play</button></div></div></div><p class="caption">Rank 0 participates too. Equal-sized chunks mirror MPI_Scatter; ordered collection mirrors MPI_Gather.</p></section>
<section id="results"><div class="section-top"><div><div class="eyebrow">02 / MEASURED, NOT ASSUMED</div><h2>Let the numbers speak.</h2><p>Startup, communication, and work all have a cost. More processes do not promise a faster run.</p></div><span class="tag">1 / 2 / 4 processes</span></div><div id="result-content" class="results-panel" aria-live="polite"><p>Loading measured results…</p></div></section>
<section id="cluster"><div class="eyebrow">03 / UNDER THE HOOD</div><h2>Three nodes. One conversation.</h2><p class="section-intro">The checked-in Compose setup runs a master and two workers on one machine. The bridge network connects them; MPI assigns processes their ranks.</p><div class="architecture"><div class="node"><span>COORDINATOR</span><h3>master</h3><code>localhost:2222 → :22</code></div><div class="network-line">mpi_net · Docker bridge</div><div class="node"><span>WORKER</span><h3>worker1</h3><code>SSH :22</code></div><div class="node"><span>WORKER</span><h3>worker2</h3><code>SSH :22</code></div></div><div class="cards"><article><span class="card-num">01</span><h3>SSH starts the conversation</h3><p>The Debian image installs OpenMPI and SSH. Supervisor keeps <code>sshd -D</code> alive; MPI can launch remote processes as <code>mpiuser</code>. Shared image keys enable local passwordless access.</p><p class="note">This learning image disables host verification and uses default credentials. Keep it isolated; it is not a production SSH configuration.</p></article><article><span class="card-num">02</span><h3>A hostfile names the seats</h3><p><code>setup.sh</code> writes one slot for each hostname and tests SSH. Slots describe launch capacity, not a guarantee of dedicated CPU cores.</p><pre>master  slots=1
worker1 slots=1
worker2 slots=1</pre></article><article><span class="card-num">03</span><h3>Same code, reachable peers</h3><p>Compose mounts <code>mpi_apps</code> at the same path on each node. Service names resolve on the bridge. SSH launches the ranks; MPI then exchanges data over its own network connections.</p><p class="note">Publishing SSH alone does not make MPI data traffic reachable across hosts.</p></article></div></section>
<section class="samples"><div class="eyebrow">04 / START WITH THE BASICS</div><h2>Small programs, clear signals.</h2><div class="sample-grid"><article><span class="language">C · MPI</span><h3>hello_world</h3><p>Each rank prints its processor name and communicator size. A quick check that every process launched.</p><code>mpirun -np 4 ./hello_world</code></article><article><span class="language">C++ · MPI</span><h3>MPI</h3><p>Adds hostname-to-IPv4 resolution to rank output. Useful for checking placement and name resolution.</p><code>mpirun -np 4 ./MPI</code></article><article><span class="language">C++ · OPENMP</span><h3>openmp_test</h3><p>Threads share one process on one host. This demonstrates shared-memory parallelism, not distributed MPI.</p><code>OMP_NUM_THREADS=4 ./openmp_test</code></article></div><p class="caption">Native command examples, after <code>make -C mpi_apps</code> and entering that directory. Docker's default hostfile has three slots; a fourth process needs adjusted capacity.</p></section>
<section class="extension"><div><div class="eyebrow">05 / BEYOND ONE MACHINE</div><h2>Take the idea to<br>another laptop.</h2><p>The repository's multi-laptop guide is an unverified extension, not a measured result of this site.</p><a href="https://github.com/AliHamzaAzam/docker-mpi-cluster/blob/main/multi_laptop_setup.md">Read the multi-laptop guide ↗</a></div><ol><li><strong>Make every rank reachable.</strong><p>Separate Docker bridges do not span laptops. Plan routable container networking and permit MPI traffic between peers.</p></li><li><strong>Match the SSH endpoint.</strong><p>The guide publishes host port 2222 but later uses default port 22. Configure the launcher's SSH port consistently and exchange keys for the actual MPI user.</p></li><li><strong>Keep binaries in sync.</strong><p>Use matching MPI versions and the same executable paths everywhere. Local bind mounts do not synchronize files between laptops.</p></li><li><strong>Verify before measuring.</strong><p>Check name resolution, SSH as mpiuser, and rank placement first. A successful SSH login alone does not validate the MPI data path.</p></li></ol></section>
</main><footer><a class="brand" href="#">mpi<span>lab</span><i></i></a><p>A lightweight cluster. A closer look at parallelism.</p><a href="https://github.com/AliHamzaAzam/docker-mpi-cluster">AliHamzaAzam / docker-mpi-cluster ↗</a></footer>`;
let rankCount = 4, stage: Stage = 0, timer: ReturnType<typeof setInterval> | undefined;
const svg = document.querySelector<SVGSVGElement>('#diagram')!;
const copy = ['Sixteen inputs begin at rank 0. Choose the number of processes, then follow each step.', 'The input is split into equal chunks. Rank 0 keeps its own chunk and sends the rest.', 'Every rank squares its own values independently. These numbers are computed by the model.', 'Rank 0 collects the squared values in rank order. The sixteen results sum to 1496.'];
function render() {
    const state = snapshot(rankCount, stage);
    document.querySelector('#stage-title')!.textContent = `${stages[stage]}${stage === 3 ? ' · complete' : ''}`;
    document.querySelector('#stage-copy')!.textContent = copy[stage];
    document.querySelectorAll<HTMLButtonElement>('[data-stage]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.stage) === stage)));
    const nodes = state.chunks.map((chunk, rank) => { const x = 450 + (rank - (rankCount - 1) / 2) * (rankCount === 2 ? 380 : 210); const width = rankCount === 1 ? 600 : rankCount === 2 ? 350 : 184; return `<path class="connection ${stage === 1 ? 'flow' : ''}" d="M450 84 L${x} 155"/><path class="connection ${stage === 3 ? 'flow' : ''}" d="M${x} 228 L450 293"/><g class="rank-node ${stage === 2 ? 'computing' : ''}"><rect x="${x - width / 2}" y="155" width="${width}" height="73" rx="12"/><text x="${x}" y="180" class="rank-label">RANK ${rank}${rank === 0 ? ' · ROOT' : ''}</text><text x="${x}" y="207">${stage === 0 ? 'Waiting' : chunk.join(' ')}</text></g>`; }).join('');
    const ledger = document.querySelector<HTMLDivElement>('#rank-values')!;
    ledger.replaceChildren();
    const valueRow = (label: string, values: string, rank?: number) => {
        const card = document.createElement('div');
        if (rank !== undefined)
            card.dataset.rankValues = String(rank);
        const heading = document.createElement('strong');
        heading.textContent = label;
        const numbers = document.createElement('p');
        numbers.textContent = values;
        card.append(heading, numbers);
        ledger.append(card);
    };
    valueRow('Input at rank 0', input.join(', '));
    state.chunks.forEach((chunk, rank) => valueRow(`Rank ${rank}${rank === 0 ? ' (root)' : ''}`, stage === 0 ? 'Waiting for input' : chunk.join(', '), rank));
    valueRow('Gathered output at rank 0', stage === 3 ? state.result.join(', ') : 'Waiting for the results');
    svg.innerHTML = `<title id="diagram-title">${stages[stage]} with ${rankCount} MPI processes</title><desc id="diagram-desc">${copy[stage]} ${stage === 3 ? 'Results: ' + state.result.join(', ') : ''}</desc>${nodes}<rect class="root" x="285" y="20" width="330" height="64" rx="12"/><text x="450" y="44" class="rank-label">INPUT AT RANK 0</text><text x="450" y="69">${input.join(' ')}</text><rect class="root" x="260" y="293" width="380" height="60" rx="12"/><text x="450" y="317" class="rank-label">${stage === 3 ? 'GATHERED OUTPUT' : 'OUTPUT AT RANK 0'}</text><text x="450" y="340">${stage === 3 ? state.result.join(' ') : 'Waiting for the results'}</text>`;
}
function pause() { if (timer !== undefined)
    clearInterval(timer); timer = undefined; document.querySelector('#play')!.textContent = 'Play'; document.querySelector('#play')!.setAttribute('aria-pressed', 'false'); }
document.querySelector('#ranks')!.addEventListener('change', event => { pause(); rankCount = Number((event.target as HTMLSelectElement).value); stage = 0; render(); });
document.querySelector('#step')!.addEventListener('click', () => { pause(); stage = advance(stage); render(); });
document.querySelector('#reset')!.addEventListener('click', () => { pause(); stage = 0; render(); });
document.querySelectorAll<HTMLButtonElement>('[data-stage]').forEach(button => button.addEventListener('click', () => { pause(); stage = Number(button.dataset.stage) as Stage; render(); }));
document.querySelector('#play')!.addEventListener('click', () => { if (timer !== undefined) {
    pause();
    return;
} if (stage === 3) {
    stage = 0;
    render();
} document.querySelector('#play')!.textContent = 'Pause'; document.querySelector('#play')!.setAttribute('aria-pressed', 'true'); timer = setInterval(() => { stage = advance(stage); render(); if (stage === 3)
    pause(); }, 1400); });
document.addEventListener('visibilitychange', () => { if (document.hidden)
    pause(); });
render();
async function loadResults() {
    const target = document.querySelector<HTMLDivElement>('#result-content')!;
    try {
        const response = await fetch(`${import.meta.env.BASE_URL}results.json`);
        if (!response.ok)
            throw new Error('No measurement file');
        const data = parseResults(await response.json());
        target.replaceChildren();
        const label = document.createElement('h3');
        label.textContent = data.mode === 'native' ? 'Native OpenMPI results, not Docker' : 'Docker container results';
        target.append(label);
        const explanation = document.createElement('p');
        explanation.textContent = 'Elapsed wall time includes process startup and output. These sample apps test launch behavior; timings do not establish compute scaling.';
        target.append(explanation);
        const table = document.createElement('table');
        table.innerHTML = '<caption>Measured elapsed time</caption><thead><tr><th scope="col">Application</th><th scope="col">Parallelism</th><th scope="col">Median ms</th></tr></thead>';
        const body = document.createElement('tbody');
        for (const row of data.runs) {
            const tr = document.createElement('tr');
            for (const value of [row.app, `${row.workers} ${row.app === 'openmp_test' ? (row.workers === 1 ? 'thread' : 'threads') : (row.workers === 1 ? 'rank' : 'ranks')}${data.mode === 'docker' ? ' / ' + row.containerCount + ' containers' : ' / native'}`, row.medianMs.toFixed(2)]) {
                const td = document.createElement('td');
                td.textContent = value;
                tr.append(td);
            }
            body.append(tr);
        }
        table.append(body);
        target.append(table);
        const details = document.createElement('details');
        const summary = document.createElement('summary');
        summary.textContent = 'Machine, compiler and reproduction';
        details.append(summary);
        const pre = document.createElement('pre');
        pre.textContent = `Machine: ${JSON.stringify(data.machine, null, 2)}\nCompiler: ${data.toolchain.compiler}\nC++ compiler: ${data.toolchain.cppCompiler ?? data.toolchain.compiler}\nMPI: ${data.toolchain.mpi}\nFlags: ${data.toolchain.flags}\nAdditional compile flags: ${(data.toolchain.extraFlags ?? []).join(" ") || "None"}\nRecorded at: ${data.generatedAt}\nMethod: ${data.methodology.description}\nLimitations: ${data.methodology.limitations.join("; ")}\nRegenerate: ${data.reproduction}`;
        details.append(pre);
        target.append(details);
        const raw = document.createElement('a');
        raw.href = `${import.meta.env.BASE_URL}results.json`;
        raw.textContent = 'Download measurement data ↗';
        target.append(raw);
        const outputs = document.createElement('details');
        const heading = document.createElement('summary');
        heading.textContent = 'Browse raw outputs';
        outputs.append(heading);
        for (const file of [...new Set(data.runs.flatMap(row => row.rawFiles))]) {
            if (!/^benchmark-raw\/[a-zA-Z0-9_.\/-]+$/.test(file) || file.includes('..'))
                continue;
            const link = document.createElement('a');
            link.href = `${import.meta.env.BASE_URL}${file}`;
            link.textContent = file.split('/').pop()!;
            link.className = 'raw-link';
            outputs.append(link);
        }
        target.append(outputs);
    }
    catch {
        target.innerHTML = '<span class="tag">No verified measurements loaded</span><h3>Evidence comes before a chart.</h3><p>Measured data is unavailable or failed validation. This page does not substitute illustrative numbers. The interactive model above explains the algorithm; it is not performance evidence.</p>';
    }
}
void loadResults();
