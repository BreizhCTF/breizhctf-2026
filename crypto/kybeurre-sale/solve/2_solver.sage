import json

N = 96
Q = 3329


def solve():
    with open("attack_data.json", "r") as f:
        data = json.load(f)

    samples = data["samples"]

    # Équation : (b - <A,s>)^2 + u(b - <A,s>) + v = 0

    # Mapping des variables
    # 0: v
    # 1: u
    # 2..N+1: z_i = u*s_i
    # N+2..2N+1: s_i (termes linéaires et quadratiques diagonaux)
    # 2N+2...: y_ij = s_i*s_j

    """
    Si on représente une *ligne* de la matrice d'attaque, on a 
    [
	1,		# [0]	variable v
	b_i,		# [1]	variable u

	# Les variables u * s_k
	-A_i[0],	# [2]
	-A_i[1],	# [3]
	...
	-A_i[N-1],	# [N+1]

	# Les s_k
	(A_i[0]**2 - 2*b_i*A_i[0]),	# [N+2]
	(A_i[1]**2 - 2*b_i*A_i[1]),	# [N+3]
	...
	(A_i[N-1]**2 - 2*b_i*A_i[N-1]),	# [2N+1]

	# Les s_k * s_p
	(2*A_i[0]*A_i[1])	# [2N+2]  s_0*s_1
	(2*A_i[0]*A_i[2])	# [2N+3]  s_0*s_2
	...
	(2*A_i[N-2]*A_i[N-1])	# [4753]  s_(N-2)*s_(N-1)
    ]

    Et on empile une ligne par sample.
    Le second membre du système, pour chaque ligne, est 
    `-b_i**2 (mod Q)`
    """


    idx_v = 0
    idx_u = 1
    idx_z = [2 + i for i in range(N)]
    idx_s = [2 + N + i for i in range(N)]

    idx_y = {}
    current_col = 2 + 2*N
    for i in range(N):
        for j in range(i+1, N):
            idx_y[(i,j)] = current_col
            current_col += 1

    total_vars = current_col
    print(f"Construction de la matrice ({len(samples)} équations, {total_vars} inconnues)")

    F = GF(Q)
    mat_rows = []
    rhs_vector = []

    # Construction de la matrice décrite ci-avant.
    for _, sample in enumerate(samples):
        A = sample['public_key']
        b = sample['ciphertext']

        row_data = [0] * total_vars
        rhs_vector.append((-b*b) % Q)

        row_data[idx_v] = 1
        if b != 0: row_data[idx_u] = b

        for i in range(N):
            row_data[idx_z[i]] = (-A[i]) % Q
            row_data[idx_s[i]] = (A[i]*A[i] - 2*b*A[i]) % Q

            for j in range(i+1, N):
                row_data[idx_y[(i,j)]] = (2 * A[i] * A[j]) % Q

        mat_rows.append(row_data)


    print("Conversion en matrice sage")
    M = Matrix(F, mat_rows)
    B = vector(F, rhs_vector)

    print("Résolution du système (merci sage :) )")
    sol = M.solve_right(B)

    print("Trouvé une solution !")
    # Extraction
    s_recovered = []
    for i in range(N):
        val = int(sol[idx_s[i]])
        s_recovered.append(val)

    print(f"Morceau de la clef : {s_recovered[:10]}")
    with open("key.json", "w") as f:
        json.dump(s_recovered, f)

if __name__ == "__main__":
    solve()
