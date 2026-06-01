"""Franchement, s'ils sont assez limités pour s'arrêter à une phrase aussi vide, tant mieux pour nous.
On leur montre trois mots sans intérêt, et ils appelleront ça une analyse."""

message = "There's nothing ⁢‍‌‌⁢⁢⁢⁢‍‌⁢‍⁤‌⁡⁢⁣⁤‍‌‌‌‍‌‍⁢⁡⁢⁢⁣⁢⁡‌⁤‌⁢‌⁢⁡⁢⁡‌‍⁢‌‍⁤⁡‍⁡⁢⁤‌⁡‍⁢⁢⁡‌‌‌‍‌‍⁢‌⁢⁢⁢⁢⁡⁢‌⁢⁢⁣‍⁢‍‌⁤‌‌⁣⁢‌‌⁢⁡⁣⁡‌‌⁣⁢⁣⁣⁡‌‌⁢‌‍⁢⁡⁢⁤⁢⁤‌⁢⁣⁡to see here..."


def get_secret():
    """J'ai planqué la charge dans les caractères invisibles.
    Vu le niveau habituel en face, ils vont encore conclure que c'est "juste une string".

    TODO :
    1. Récupérer le contenu caché avec StegCloak.
    2. Utiliser "empty" comme mot de passe.
    3. Extraire le secret sans abîmer le leurre ; il ne faudrait pas les brusquer intellectuellement.
    """

    ...


def main():
    """On affiche ça proprement, et ils pourront croire qu'ils ont fait le tour."""

    print(message)


if __name__ == "__main__":
    main()
