## *Project Hub* Based on *TW5 Farm* Technology

*TW5 Farm* is a method of centralized multi-wiki support on the Internet.

Conceptually, tenology comprises the following phases:

* Preparing a separate wiki by means of [Tiddlywiki](https://tiddlywiki.com/) by a group of authors on their own local computers.
* When creating the content, the authors synchronize the wiki folder through the [Google Drive](https://drive.google.com/) cloud.
* For each wiki, the editor pre-creates a wiki repository on [Github](https://github.com/), from which then the wiki is published on the Internet using [Github Pages](https://pages.github.com/).

An excellent feature of the *TW5 Farm* technology is the function of automated collection of information on all wikis included in the collection and presentation in a separate central wiki. The central wiki for this collection called *Project Hub* is located at https://protw.github.io/.

To provide this feature, each wiki contains a standardized `$:/boa/logo` tiddler (as a separate article is referred *Tiddlywiki*), which contains the information needed to represent the wiki outside.

The core of the technology is the `tw_builder.m` script, written by means of a high-level programming language -  *Octave*. The editor runs this script on own computer. The script updates the wiki information in the *Github* repository, updates the wiki collection information, prepares and executes the process of publishing on the Internet.

The script code, additional resources, and description of the technology are available at https://github.com/protw/twfarm. The technology description wiki is available at https://protw.github.io/twfarm.

For a full-fledged work, the author must be able to write texts in *Tiddlywiki* and also install on own computer:

* a local server for multiple wikis on *Tiddlywiki* - [OokTech / TW5-BobEXE](https://github.com/OokTech/TW5-BobEXE);
* Google application [Backup and sync] (https://www.google.com/drive/download/backup-and-sync/).

The editor in order to run the `tw_builder.m` script, in addition to the above list, has to install on own computer [Octave sofware] (https://www.gnu.org/software/octave/) and the function library [fangq/jsonlab](https://github.com/fangq/jsonlab) to ptocess *JSON* data.

## *Project Hub* на базі технології *TW5 Farm*

*TW5 Farm* - це метод централізованої підтримки декількох вікі у мережі інтернет.

Концептуально тенологія розкладається на такі фази:

* Підготовка окремої вікі інструментами [Tiddlywiki](https://tiddlywiki.com/) групою авторів на власних локальних комп'ютерах. 
* Під час створення змісту автори синхронізують фолдер вікі через хмарний [Гугл Диск](https://drive.google.com/).
* Для кожної вікі редактор попередньо створює репозитарій вікі на сервісі [Github](https://github.com/), з якого потім відбувається опублікування в інтернеті з допомогою сервісу [Github Pages](https://pages.github.com/).

Чудовою властивістю технології *TW5 Farm* є функція автоматизованого збирання інформації про всі вікі, що включені до колекції, та представлення в окремій центральній вікі. Центральна вікі для цієї колекції під назвою *Project Hub* доступна за адресою https://protw.github.io/.

Для забезпечення цієї функції кожна вікі містить стандартизований тідлер `$:/boa/logo` (так в *Tiddlywiki* називають окремі статті), в якому міститься інформація, необхідна для представлення вікі назовні.

Ядром технології є скрипт `tw_builder.m`, написаний мовою програмування високого рівня *Octave*. Редактор запускає цей скрипт на своєму комп'ютері. Скрипт оновлює інформацію про вікі в репозитарії *Github*, оновлює інформацію про колекцію вікі, готує і проведить процес публікування в інтернеті.

Код скрипта, додаткові ресурси і опис технології у вигляді окремої вікі розташовані за адресою https://github.com/protw/twfarm. Вікі з описом технології оприлюднена за адресою https://protw.github.io/twfarm.

Для повноцінної роботи автор має вміти писати тексти у *Tiddlywiki*, а також встановити на своєму комп'ютері:

* локальний сервер *Tiddlywiki* [OokTech/TW5-BobEXE](https://github.com/OokTech/TW5-BobEXE);
* Застосунок Гугл [Резервне копіювання і синхронізація](https://www.google.com/intl/uk_ALL/drive/).

Редактору для запуску скрипта `tw_builder.m` додатково до вищезазначеного списку треба встановити на своєму комп'ютері [Octave](https://www.gnu.org/software/octave/), а також бібліотеку функцій [fangq/jsonlab](https://github.com/fangq/jsonlab) для роботи з даними формату *JSON*.